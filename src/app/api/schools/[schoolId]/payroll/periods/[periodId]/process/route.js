// Process Payroll API
// POST - Calculate and generate payroll items for all active employees

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from "@/lib/cache";
import { sendNotification } from '@/lib/notifications/notificationHelper';

// POST - Process payroll for the period
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId, periodId } = params;
    const { processedBy } = await req.json();

    if (!processedBy) {
        return NextResponse.json({
            error: 'processedBy is required'
        }, { status: 400 });
    }

    try {
        // Get the period
        const period = await prisma.payrollPeriod.findUnique({
            where: { id: periodId }
        });

        if (!period) {
            return NextResponse.json({
                error: 'Payroll period not found'
            }, { status: 404 });
        }

        if (period.schoolId !== schoolId) {
            return NextResponse.json({
                error: 'Unauthorized'
            }, { status: 403 });
        }

        if (period.status !== 'DRAFT') {
            return NextResponse.json({
                error: `Cannot process payroll in ${period.status} status`
            }, { status: 400 });
        }

        // Get payroll configuration
        const config = await prisma.payrollConfig.findUnique({
            where: { schoolId }
        });

        if (!config) {
            return NextResponse.json({
                error: 'Payroll configuration not found. Please configure payroll settings first.'
            }, { status: 400 });
        }

        // Get ALL active employees (including those without salary structures for proper validation)
        const allEmployees = await prisma.employeePayrollProfile.findMany({
            where: {
                schoolId,
                isActive: true,
            },
            include: {
                salaryStructure: true,
                user: { select: { name: true } },
                loans: {
                    where: {
                        status: 'ACTIVE'
                    },
                    include: {
                        repayments: {
                            where: {
                                month: period.month,
                                year: period.year,
                                status: 'PENDING'
                            }
                        }
                    }
                },
                deductions: {
                    where: {
                        isActive: true,
                        startDate: { lte: period.endDate },
                        OR: [
                            { endDate: null },
                            { endDate: { gte: period.startDate } }
                        ]
                    }
                }
            }
        });

        // DEBUG LOGGING
        console.log(`[Process Payroll] School: ${schoolId}`);
        console.log(`[Process Payroll] Total employees found: ${allEmployees.length}`);
        allEmployees.forEach(emp => {
            console.log(`  - ${emp.user?.name}: isActive=${emp.isActive}, hasSalary=${!!emp.salaryStructure}, gross=${emp.salaryStructure?.grossSalary}`);
        });

        if (allEmployees.length === 0) {
            return NextResponse.json({
                error: 'No active employees found in payroll'
            }, { status: 400 });
        }

        // Validation summary tracking
        const validationSummary = {
            ready: 0,
            onHoldBank: 0,
            onHoldApproval: 0,
            skippedNoStructure: 0
        };

        // Update period status to processing
        await prisma.payrollPeriod.update({
            where: { id: periodId },
            data: { status: 'PROCESSING' }
        });

        const results = { success: [], failed: [], skipped: [], onHold: [] };

        // Process each employee
        for (const employee of allEmployees) {
            try {
                // === VALIDATION: Check employee readiness ===
                let readiness = 'READY';
                let holdReason = null;

                // Check 1: Salary structure assigned?
                if (!employee.salaryStructureId || !employee.salaryStructure) {
                    readiness = 'SKIPPED_NO_STRUCTURE';
                    holdReason = 'No salary structure assigned';
                    validationSummary.skippedNoStructure++;

                    // Create a payroll item with SKIPPED status (no salary calculation)
                    await prisma.payrollItem.upsert({
                        where: {
                            periodId_employeeId: { periodId, employeeId: employee.id }
                        },
                        update: {
                            readiness,
                            holdReason,
                            netSalary: 0,
                            grossEarnings: 0,
                            totalDeductions: 0
                        },
                        create: {
                            periodId,
                            employeeId: employee.id,
                            readiness,
                            holdReason,
                            netSalary: 0,
                            grossEarnings: 0,
                            totalDeductions: 0
                        }
                    });

                    results.skipped.push({
                        employeeId: employee.id,
                        name: employee.user?.name,
                        reason: holdReason
                    });
                    continue;
                }

                // Check 2: Bank details present?
                const hasBankDetails = employee.accountNumber && employee.ifscCode;
                if (!hasBankDetails) {
                    readiness = 'ON_HOLD_BANK';
                    holdReason = 'Bank details missing';
                    validationSummary.onHoldBank++;
                }

                // Check 3: Pending profile updates awaiting approval?
                if (employee.pendingBankDetails || employee.pendingIdDetails) {
                    readiness = 'ON_HOLD_APPROVAL';
                    holdReason = 'Profile updates pending admin approval';
                    validationSummary.onHoldApproval++;
                }

                // If READY, increment counter
                if (readiness === 'READY') {
                    validationSummary.ready++;
                }
                // Get attendance data for the period
                const attendance = await prisma.attendance.findMany({
                    where: {
                        userId: employee.userId,
                        schoolId,
                        date: {
                            gte: period.startDate,
                            lte: period.endDate
                        }
                    }
                });

                // Get leave requests for this period (to check paid vs unpaid leave)
                const leaveRequests = await prisma.leaveRequest.findMany({
                    where: {
                        userId: employee.userId,
                        schoolId,
                        status: 'APPROVED',
                        OR: [
                            {
                                startDate: { gte: period.startDate, lte: period.endDate }
                            },
                            {
                                endDate: { gte: period.startDate, lte: period.endDate }
                            }
                        ]
                    },
                    select: {
                        startDate: true,
                        endDate: true,
                        leaveType: true,
                        totalDays: true
                    }
                });

                // Count unpaid leave days from leave requests
                let unpaidLeaveDays = 0;
                for (const leave of leaveRequests) {
                    // Check if this leave type is unpaid (LOP/UNPAID types)
                    if (leave.leaveType === 'UNPAID' || leave.leaveType === 'LOP') {
                        unpaidLeaveDays += leave.totalDays || 1;
                    }
                }

                // Calculate attendance stats
                let daysWorked = 0;
                let daysAbsent = 0;
                let daysLeave = 0;
                let lateCount = 0;
                let halfDayCount = 0;

                for (const record of attendance) {
                    switch (record.status) {
                        case 'PRESENT':
                            daysWorked++;
                            if (record.isLateCheckIn) lateCount++;
                            break;
                        case 'ABSENT':
                            daysAbsent++;
                            break;
                        case 'ON_LEAVE':
                            daysLeave++;
                            break;
                        case 'HALF_DAY':
                            halfDayCount++;
                            daysWorked += 0.5;
                            break;
                        case 'LATE':
                            daysWorked++;
                            lateCount++;
                            break;
                    }
                }

                // If no attendance records, daysWorked remains 0 (Dynamic Calculation)
                // PREVIOUS LOGIC REMOVED: if (attendance.length === 0) { daysWorked = period.totalWorkingDays; }

                // Guard against division by zero
                const workingDays = period.totalWorkingDays || 1;
                const structure = employee.salaryStructure;

                // If daysWorked is 0 after checks, we should process with 0 salary but mark appropriately
                // The user requested: "if working days are 0 show warning payroll cant be proceeed"
                // But generally we should process them as Loss of Pay or 0 earnings.

                const workFactor = daysWorked / workingDays;

                // Calculate earnings (pro-rated based on attendance)
                const basicEarned = structure.basicSalary * workFactor;
                const hraEarned = (structure.basicSalary * structure.hraPercent / 100) * workFactor;
                const daEarned = (structure.basicSalary * structure.daPercent / 100) * workFactor;
                const taEarned = structure.taAmount * workFactor;
                const medicalEarned = structure.medicalAllowance * workFactor;
                const specialEarned = structure.specialAllowance * workFactor;
                const grossEarnings = basicEarned + hraEarned + daEarned + taEarned + medicalEarned + specialEarned;

                // Calculate Loss of Pay for unpaid leaves
                // Per-day salary = gross / working days
                const perDaySalary = structure.grossSalary / workingDays;
                let lossOfPay = unpaidLeaveDays * perDaySalary;

                // Also add LOP for late penalties if configured
                if (config.latePenaltyEnabled && lateCount > config.allowedLateCount) {
                    const excessLates = lateCount - config.allowedLateCount;
                    const latePenaltyDays = Math.floor(excessLates / (config.latesPerLop || 3)); // Default: 3 lates = 1 day LOP
                    lossOfPay += latePenaltyDays * perDaySalary;
                }

                // Calculate statutory deductions
                let pfEmployee = 0;
                let pfEmployer = 0;
                if (config.enablePF && basicEarned <= config.pfWageLimit) {
                    pfEmployee = (Math.min(basicEarned, config.pfWageLimit) * config.pfEmployeePercent) / 100;
                    pfEmployer = (Math.min(basicEarned, config.pfWageLimit) * config.pfEmployerPercent) / 100;
                }

                let esiEmployee = 0;
                let esiEmployer = 0;
                if (config.enableESI && grossEarnings <= config.esiWageLimit) {
                    esiEmployee = (grossEarnings * config.esiEmployeePercent) / 100;
                    esiEmployer = (grossEarnings * config.esiEmployerPercent) / 100;
                }

                // Professional Tax (simplified - monthly fixed amount)
                let professionalTax = 0;
                if (config.enableProfessionalTax && grossEarnings > 0) {
                    // Default PT slab (can be customized via config)
                    if (grossEarnings > 20000) professionalTax = 200;
                    else if (grossEarnings > 15000) professionalTax = 150;
                    else if (grossEarnings > 10000) professionalTax = 100;
                }

                // TDS (simplified monthly calculation)
                let tds = 0;
                if (config.enableTDS) {
                    const annualGross = grossEarnings * 12;
                    // Standard deduction
                    const taxableIncome = annualGross - 50000;

                    // New regime slabs (simplified)
                    if (taxableIncome > 1500000) {
                        tds = ((taxableIncome - 1500000) * 0.30 + 225000) / 12;
                    } else if (taxableIncome > 1200000) {
                        tds = ((taxableIncome - 1200000) * 0.20 + 165000) / 12;
                    } else if (taxableIncome > 900000) {
                        tds = ((taxableIncome - 900000) * 0.15 + 120000) / 12;
                    } else if (taxableIncome > 600000) {
                        tds = ((taxableIncome - 600000) * 0.10 + 75000) / 12;
                    } else if (taxableIncome > 300000) {
                        tds = ((taxableIncome - 300000) * 0.05) / 12;
                    }
                }

                // Loan EMI deductions
                let loanDeduction = 0;
                for (const loan of employee.loans) {
                    if (loan.repayments.length > 0) {
                        loanDeduction += loan.emiAmount;
                    }
                }

                // Other deductions
                let otherDeductions = 0;
                const otherDeductionsList = [];
                for (const deduction of employee.deductions) {
                    if (deduction.frequency === 'ONE_TIME' || deduction.frequency === 'MONTHLY') {
                        otherDeductions += deduction.amount;
                        otherDeductionsList.push({
                            name: deduction.description,
                            amount: deduction.amount
                        });
                    }
                }

                const totalDeductions = pfEmployee + esiEmployee + professionalTax + tds + loanDeduction + otherDeductions + lossOfPay;
                const netSalary = Math.max(0, grossEarnings - totalDeductions);

                // DEBUG: Log detailed info for each employee before upsert
                console.log(`[Process Payroll] Processing ${employee.user?.name}:`);
                console.log(`  - Employee ID: ${employee.id}`);
                console.log(`  - Has salary structure: ${!!employee.salaryStructure}`);
                console.log(`  - Days worked: ${daysWorked} / ${workingDays}`);
                console.log(`  - Gross earnings: ${grossEarnings}`);
                console.log(`  - Net salary: ${netSalary}`);
                console.log(`  - Readiness: ${readiness}`);
                console.log(`  - Hold reason: ${holdReason}`);

                // Create or update payroll item
                await prisma.payrollItem.upsert({
                    where: {
                        periodId_employeeId: {
                            periodId,
                            employeeId: employee.id
                        }
                    },
                    update: {
                        daysWorked: Math.floor(daysWorked),
                        daysAbsent,
                        daysLeave,
                        daysHoliday: period.holidays,
                        lateCount,
                        halfDayCount,
                        basicEarned,
                        hraEarned,
                        daEarned,
                        taEarned,
                        medicalEarned,
                        specialEarned,
                        grossEarnings,
                        pfEmployee,
                        pfEmployer,
                        esiEmployee,
                        esiEmployer,
                        professionalTax,
                        tds,
                        loanDeduction,
                        lossOfPay,
                        otherDeductions: otherDeductionsList.length > 0 ? otherDeductionsList : null,
                        totalDeductions,
                        netSalary,
                        paymentStatus: 'PENDING',
                        readiness,
                        holdReason
                    },
                    create: {
                        periodId,
                        employeeId: employee.id,
                        daysWorked: Math.floor(daysWorked),
                        daysAbsent,
                        daysLeave,
                        daysHoliday: period.holidays,
                        lateCount,
                        halfDayCount,
                        basicEarned,
                        hraEarned,
                        daEarned,
                        taEarned,
                        medicalEarned,
                        specialEarned,
                        grossEarnings,
                        pfEmployee,
                        pfEmployer,
                        esiEmployee,
                        esiEmployer,
                        professionalTax,
                        tds,
                        loanDeduction,
                        lossOfPay,
                        otherDeductions: otherDeductionsList.length > 0 ? otherDeductionsList : null,
                        totalDeductions,
                        netSalary,
                        paymentStatus: 'PENDING',
                        readiness,
                        holdReason
                    }
                });

                console.log(`  ✓ Payroll item created/updated for ${employee.user?.name}`);

                // Mark loan repayments as deducted
                for (const loan of employee.loans) {
                    for (const repayment of loan.repayments) {
                        await prisma.loanRepayment.update({
                            where: { id: repayment.id },
                            data: { status: 'DEDUCTED' }
                        });
                    }
                }

                results.success.push({
                    employeeId: employee.id,
                    name: employee.user?.name,
                    netSalary,
                    readiness,
                    holdReason
                });

                // Track on-hold employees separately for easy UI display
                if (readiness === 'ON_HOLD_BANK' || readiness === 'ON_HOLD_APPROVAL') {
                    results.onHold.push({
                        employeeId: employee.id,
                        name: employee.user?.name,
                        netSalary,
                        reason: holdReason
                    });
                }
            } catch (error) {
                console.error(`[Process Payroll] FAILED for ${employee.user?.name} (${employee.id}):`, error.message);
                console.error(error.stack);

                // IMPORTANT: Still create a payroll item with FAILED status
                // Otherwise the employee becomes orphaned as "missing"
                try {
                    await prisma.payrollItem.upsert({
                        where: {
                            periodId_employeeId: { periodId, employeeId: employee.id }
                        },
                        update: {
                            readiness: 'ON_HOLD_BANK',
                            holdReason: `Processing error - please retry`,
                            netSalary: 0,
                            grossEarnings: employee.salaryStructure?.grossSalary || 0,
                            totalDeductions: 0,
                            daysWorked: 0
                        },
                        create: {
                            periodId,
                            employeeId: employee.id,
                            readiness: 'ON_HOLD_BANK',
                            holdReason: `Processing error - please retry`,
                            netSalary: 0,
                            grossEarnings: employee.salaryStructure?.grossSalary || 0,
                            totalDeductions: 0,
                            daysWorked: 0
                        }
                    });
                } catch (upsertError) {
                    console.error(`[Process Payroll] Failed to create fallback item:`, upsertError.message);
                }

                results.failed.push({
                    employeeId: employee.id,
                    name: employee.user?.name,
                    error: error.message
                });
            }
        }

        // Calculate totals
        const items = await prisma.payrollItem.findMany({
            where: { periodId }
        });

        const totalGrossSalary = items.reduce((sum, i) => sum + i.grossEarnings, 0);
        const totalDeductions = items.reduce((sum, i) => sum + i.totalDeductions, 0);
        const totalNetSalary = items.reduce((sum, i) => sum + i.netSalary, 0);

        // Update period status
        await prisma.payrollPeriod.update({
            where: { id: periodId },
            data: {
                status: 'PENDING_APPROVAL',
                processedAt: new Date(),
                processedBy,
                totalEmployees: results.success.length,
                totalGrossSalary,
                totalDeductions,
                totalNetSalary
            }
        });

        // Invalidate cache
        await invalidatePattern(`payroll:periods:${schoolId}*`);

        // Send notification to director/admin for approval
        const monthName = new Date(period.year, period.month - 1).toLocaleString('default', { month: 'long' });

        try {
            // Build validation summary message for admin
            let adminMessage = `Payroll for ${monthName} ${period.year} processed. `;
            adminMessage += `✅ Ready: ${validationSummary.ready} | `;
            if (validationSummary.onHoldBank > 0) {
                adminMessage += `⚠️ Missing Bank: ${validationSummary.onHoldBank} | `;
            }
            if (validationSummary.onHoldApproval > 0) {
                adminMessage += `⏳ Pending Approval: ${validationSummary.onHoldApproval} | `;
            }
            if (validationSummary.skippedNoStructure > 0) {
                adminMessage += `❌ No Structure: ${validationSummary.skippedNoStructure} | `;
            }
            adminMessage += `Net: ₹${totalNetSalary.toLocaleString('en-IN')}`;

            // Notify admin/director/principal
            await sendNotification({
                schoolId,
                title: '📋 Payroll Processed - Review Required',
                message: adminMessage,
                type: 'FEE',
                priority: 'HIGH',
                targetOptions: {
                    roleNames: ['DIRECTOR', 'ADMIN', 'PRINCIPAL', 'ACCOUNTANT']
                },
                senderId: processedBy,
                metadata: {
                    type: 'PAYROLL_APPROVAL_REQUEST',
                    periodId,
                    month: period.month,
                    year: period.year,
                    totalAmount: totalNetSalary,
                    validationSummary
                },
                actionUrl: `/dashboard/payroll/process/${periodId}`
            });

            // Notify all READY employees that their salary has been calculated
            const readyEmployeeUserIds = results.success
                .filter(e => e.readiness === 'READY')
                .map(e => allEmployees.find(emp => emp.id === e.employeeId)?.userId)
                .filter(Boolean);

            if (readyEmployeeUserIds.length > 0) {
                await sendNotification({
                    schoolId,
                    title: '💰 Salary Processed',
                    message: `Your salary for ${monthName} ${period.year} has been calculated and is pending approval.`,
                    type: 'FEE',
                    priority: 'NORMAL',
                    targetOptions: {
                        userIds: readyEmployeeUserIds
                    },
                    senderId: processedBy,
                    metadata: {
                        type: 'PAYROLL_PROCESSED',
                        periodId,
                        month: period.month,
                        year: period.year
                    },
                    actionUrl: '/my-payroll'
                });
            }

            // Notify ON_HOLD employees about their issue
            const onHoldBankEmployees = results.success
                .filter(e => e.readiness === 'ON_HOLD_BANK')
                .map(e => allEmployees.find(emp => emp.id === e.employeeId)?.userId)
                .filter(Boolean);

            if (onHoldBankEmployees.length > 0) {
                await sendNotification({
                    schoolId,
                    title: '⚠️ Payroll On Hold - Bank Details Missing',
                    message: `Your ${monthName} ${period.year} salary was calculated but payment is on hold. Please update your bank details.`,
                    type: 'FEE',
                    priority: 'HIGH',
                    targetOptions: {
                        userIds: onHoldBankEmployees
                    },
                    senderId: processedBy,
                    metadata: {
                        type: 'PAYROLL_ON_HOLD',
                        reason: 'BANK_DETAILS_MISSING',
                        periodId,
                        month: period.month,
                        year: period.year
                    },
                    actionUrl: '/my-payroll'
                });
            }
        } catch (notifError) {
            console.error('Notification failed:', notifError);
            // Don't fail the request if notification fails
        }

        return NextResponse.json({
            success: true,
            message: 'Payroll processed successfully',
            summary: {
                processed: results.success.length,
                failed: results.failed.length,
                skipped: results.skipped.length,
                onHold: results.onHold.length,
                totalGross: totalGrossSalary,
                totalDeductions,
                totalNet: totalNetSalary
            },
            validationSummary: {
                ready: validationSummary.ready,
                onHoldBank: validationSummary.onHoldBank,
                onHoldApproval: validationSummary.onHoldApproval,
                skippedNoStructure: validationSummary.skippedNoStructure,
                total: allEmployees.length
            },
            results
        });
    } catch (error) {
        console.error('Payroll processing error:', error);

        // Reset period status on error
        await prisma.payrollPeriod.update({
            where: { id: periodId },
            data: { status: 'DRAFT' }
        });

        return NextResponse.json({
            error: 'Failed to process payroll',
            details: error.message
        }, { status: 500 });
    }
}
