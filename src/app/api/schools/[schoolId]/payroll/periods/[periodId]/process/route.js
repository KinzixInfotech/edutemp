// Process Payroll API
// POST - Calculate and generate payroll items for all active employees

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from "@/lib/cache";

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

        // Get all active employees with salary structures
        const employees = await prisma.employeePayrollProfile.findMany({
            where: {
                schoolId,
                isActive: true,
                salaryStructureId: { not: null }
            },
            include: {
                salaryStructure: true,
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

        if (employees.length === 0) {
            return NextResponse.json({
                error: 'No active employees with salary structures found'
            }, { status: 400 });
        }

        // Update period status to processing
        await prisma.payrollPeriod.update({
            where: { id: periodId },
            data: { status: 'PROCESSING' }
        });

        const results = { success: [], failed: [] };

        // Process each employee
        for (const employee of employees) {
            try {
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

                // If no attendance records, assume full working days
                if (attendance.length === 0) {
                    daysWorked = period.totalWorkingDays;
                }

                const structure = employee.salaryStructure;
                const workingDays = period.totalWorkingDays;
                const workFactor = daysWorked / workingDays;

                // Calculate earnings (pro-rated based on attendance)
                const basicEarned = structure.basicSalary * workFactor;
                const hraEarned = (structure.basicSalary * structure.hraPercent / 100) * workFactor;
                const daEarned = (structure.basicSalary * structure.daPercent / 100) * workFactor;
                const taEarned = structure.taAmount * workFactor;
                const medicalEarned = structure.medicalAllowance * workFactor;
                const specialEarned = structure.specialAllowance * workFactor;
                const grossEarnings = basicEarned + hraEarned + daEarned + taEarned + medicalEarned + specialEarned;

                // Calculate Loss of Pay
                // NOTE: Since earnings are already pro-rated based on worked days (workFactor),
                // we don't need to deduct LOP separately - that would be double-counting.
                // LOP is only applicable if there are unpaid leave days beyond normal absence.
                let lossOfPay = 0;

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
                const netSalary = grossEarnings - totalDeductions;

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
                        paymentStatus: 'PENDING'
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
                        paymentStatus: 'PENDING'
                    }
                });

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
                    netSalary
                });
            } catch (error) {
                results.failed.push({
                    employeeId: employee.id,
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

        return NextResponse.json({
            success: true,
            message: 'Payroll processed successfully',
            summary: {
                processed: results.success.length,
                failed: results.failed.length,
                totalGross: totalGrossSalary,
                totalDeductions,
                totalNet: totalNetSalary
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
