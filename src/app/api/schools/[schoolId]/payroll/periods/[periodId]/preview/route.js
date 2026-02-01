// Preview Payroll API
// GET - Show all employees and their expected payroll BEFORE processing
// This allows admins to see who will be included and any issues

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, periodId } = params;

    try {
        // Get the period
        const period = await prisma.payrollPeriod.findUnique({
            where: { id: periodId },
            include: {
                payrollItems: {
                    select: { employeeId: true }
                }
            }
        });

        if (!period) {
            return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 });
        }

        if (period.schoolId !== schoolId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get ALL active employees
        const allEmployees = await prisma.employeePayrollProfile.findMany({
            where: {
                schoolId,
                isActive: true
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profilePicture: true
                    }
                },
                salaryStructure: {
                    select: {
                        id: true,
                        name: true,
                        grossSalary: true,
                        basicSalary: true
                    }
                }
            }
        });

        // Get attendance data for the period for all employees
        const userIds = allEmployees.map(emp => emp.userId);
        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                userId: { in: userIds },
                schoolId,
                date: {
                    gte: period.startDate,
                    lte: period.endDate
                }
            }
        });

        // Group attendance by userId
        const attendanceByUser = {};
        for (const record of attendanceRecords) {
            if (!attendanceByUser[record.userId]) {
                attendanceByUser[record.userId] = [];
            }
            attendanceByUser[record.userId].push(record);
        }

        // IDs of employees already processed in this period
        const processedEmployeeIds = new Set(period.payrollItems.map(item => item.employeeId));

        // Summary counters
        const summary = {
            totalEmployees: allEmployees.length,
            readyToProcess: 0,
            noStructure: 0,
            noBankDetails: 0,
            pendingApproval: 0,
            noAttendance: 0,
            alreadyProcessed: processedEmployeeIds.size
        };

        // Build employee preview data
        const employees = allEmployees.map(emp => {
            const attendance = attendanceByUser[emp.userId] || [];

            // Calculate working days from attendance
            let daysWorked = 0;
            let daysAbsent = 0;
            let daysLeave = 0;
            let halfDayCount = 0;

            for (const record of attendance) {
                switch (record.status) {
                    case 'PRESENT':
                    case 'LATE':
                        daysWorked++;
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
                }
            }

            // Determine readiness status and warnings
            const warnings = [];
            let readiness = 'READY';
            let readinessMessage = 'Ready to process';

            // Check 1: Already processed?
            const isProcessed = processedEmployeeIds.has(emp.id);
            if (isProcessed) {
                readiness = 'ALREADY_PROCESSED';
                readinessMessage = 'Already in payroll';
            }

            // Check 2: Salary structure
            if (!emp.salaryStructure && !isProcessed) {
                readiness = 'NO_STRUCTURE';
                readinessMessage = 'No salary structure assigned';
                summary.noStructure++;
            }

            // Check 3: Bank details
            const hasBankDetails = !!(emp.accountNumber && emp.ifscCode);
            if (!hasBankDetails && readiness === 'READY') {
                readiness = 'NO_BANK';
                readinessMessage = 'Bank details missing';
                summary.noBankDetails++;
                warnings.push('Bank details required for payment');
            }

            // Check 4: Pending approval
            if ((emp.pendingBankDetails || emp.pendingIdDetails) && readiness === 'READY') {
                readiness = 'PENDING_APPROVAL';
                readinessMessage = 'Profile updates pending approval';
                summary.pendingApproval++;
            }

            // Check 5: No attendance records
            if (attendance.length === 0 && !isProcessed) {
                warnings.push('No attendance records found');
                summary.noAttendance++;
                daysWorked = 0; // Dynamic: 0 attendance = 0 days
            }

            // Count ready employees
            if (readiness === 'READY') {
                summary.readyToProcess++;
            }

            // Calculate expected salary (pro-rated)
            let expectedGross = 0;
            let expectedNet = 0;
            if (emp.salaryStructure) {
                const workFactor = daysWorked / (period.totalWorkingDays || 1);
                expectedGross = Math.round(emp.salaryStructure.grossSalary * workFactor);
                expectedNet = expectedGross; // Simplified - actual deductions calculated during processing
            }

            return {
                id: emp.id,
                userId: emp.userId,
                name: emp.user?.name || 'Unknown',
                email: emp.user?.email,
                profilePicture: emp.user?.profilePicture,
                designation: emp.employeeType === 'TEACHING' ? 'Teaching Staff' : 'Non-Teaching Staff',
                employeeType: emp.employeeType,

                // Salary info
                hasSalaryStructure: !!emp.salaryStructure,
                salaryStructureName: emp.salaryStructure?.name || null,
                grossSalary: emp.salaryStructure?.grossSalary || 0,
                expectedGross,
                expectedNet,

                // Attendance summary
                attendanceRecords: attendance.length,
                workingDays: Math.round(daysWorked * 10) / 10, // Round to 1 decimal
                daysAbsent,
                daysLeave,
                halfDayCount,
                totalPeriodDays: period.totalWorkingDays,

                // Bank details
                hasBankDetails,
                bankName: emp.bankName,

                // Approval status
                pendingApproval: !!(emp.pendingBankDetails || emp.pendingIdDetails),

                // Readiness
                readiness,
                readinessMessage,
                warnings,
                isProcessed
            };
        });

        // Sort: Ready first, then by name
        employees.sort((a, b) => {
            if (a.readiness === 'READY' && b.readiness !== 'READY') return -1;
            if (a.readiness !== 'READY' && b.readiness === 'READY') return 1;
            if (a.readiness === 'NO_STRUCTURE' && b.readiness !== 'NO_STRUCTURE') return 1;
            if (a.readiness !== 'NO_STRUCTURE' && b.readiness === 'NO_STRUCTURE') return -1;
            return a.name.localeCompare(b.name);
        });

        return NextResponse.json({
            period: {
                id: period.id,
                month: period.month,
                year: period.year,
                periodLabel: period.periodLabel,
                startDate: period.startDate,
                endDate: period.endDate,
                totalWorkingDays: period.totalWorkingDays,
                status: period.status,
                processedAt: period.processedAt
            },
            employees,
            summary
        });
    } catch (error) {
        console.error('Payroll preview error:', error);
        return NextResponse.json({
            error: 'Failed to generate payroll preview',
            details: error.message
        }, { status: 500 });
    }
}
