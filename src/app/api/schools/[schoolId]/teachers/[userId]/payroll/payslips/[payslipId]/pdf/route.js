// Teacher Payslip PDF Download API
// GET /api/schools/[schoolId]/teachers/[userId]/payroll/payslips/[payslipId]/pdf
// Note: payslipId is actually a PayrollItem ID, not a Payslip ID

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generatePayslipPDF, getPayslipFilename } from '@/lib/payroll/generatePayslipPDF.jsx';

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, userId, payslipId } = params;

    try {
        // Note: payslipId here is actually a PayrollItem ID (from the payslips list API)
        console.log(`[Payslip PDF] Looking for PayrollItem: ${payslipId}, user: ${userId}`);

        // Get the payroll item with related data
        const payrollItem = await prisma.payrollItem.findUnique({
            where: { id: payslipId },
            include: {
                period: true,
                employee: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        if (!payrollItem) {
            console.log(`[Payslip PDF] PayrollItem not found: ${payslipId}`);
            return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 });
        }

        // Verify the teacher has access to this payslip
        const employeeUserId = payrollItem.employee.userId;
        if (employeeUserId !== userId) {
            return NextResponse.json({ error: 'Unauthorized - this is not your payslip' }, { status: 403 });
        }

        // Get school details
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                name: true,
                location: true,
                contactNumber: true,
                profilePicture: true
            }
        });

        // Get staff details (teaching staff or non-teaching)
        let staff = await prisma.teachingStaff.findUnique({
            where: { userId: userId },
            select: {
                employeeId: true,
                designation: true,
                department: { select: { name: true } }
            }
        });

        if (!staff) {
            staff = await prisma.nonTeachingStaff.findUnique({
                where: { userId: userId },
                select: {
                    employeeId: true,
                    designation: true,
                    department: { select: { name: true } }
                }
            });
        }

        const profile = payrollItem.employee;
        const item = payrollItem;

        // Build earnings array
        const earnings = [
            { label: 'Basic Salary', amount: item.basicEarned || 0 },
            { label: 'HRA', amount: item.hraEarned || 0 },
            { label: 'DA', amount: item.daEarned || 0 },
            { label: 'TA', amount: item.taEarned || 0 },
            { label: 'Medical', amount: item.medicalEarned || 0 },
            { label: 'Special', amount: item.specialEarned || 0 },
        ].filter(e => e.amount > 0);

        if (item.overtimeEarned > 0) earnings.push({ label: 'Overtime', amount: item.overtimeEarned });
        if (item.incentives > 0) earnings.push({ label: 'Incentives', amount: item.incentives });
        if (item.arrears > 0) earnings.push({ label: 'Arrears', amount: item.arrears });

        // Build deductions array
        const deductions = [];
        if (item.pfEmployee > 0) deductions.push({ label: 'PF (Employee)', amount: item.pfEmployee });
        if (item.esiEmployee > 0) deductions.push({ label: 'ESI (Employee)', amount: item.esiEmployee });
        if (item.professionalTax > 0) deductions.push({ label: 'Professional Tax', amount: item.professionalTax });
        if (item.tds > 0) deductions.push({ label: 'TDS', amount: item.tds });
        if (item.loanDeduction > 0) deductions.push({ label: 'Loan EMI', amount: item.loanDeduction });
        if (item.advanceDeduction > 0) deductions.push({ label: 'Advance', amount: item.advanceDeduction });
        if (item.lossOfPay > 0) deductions.push({ label: 'Loss of Pay', amount: item.lossOfPay });

        const pdfData = {
            payslip: {
                month: item.period.month,
                year: item.period.year,
                daysWorked: item.daysWorked || 0,
                daysAbsent: item.daysAbsent || 0,
                totalWorkingDays: item.period.totalWorkingDays || 0,
                grossEarnings: item.grossEarnings || 0,
                totalDeductions: item.totalDeductions || 0,
                netSalary: item.netSalary || 0,
                earnings,
                deductions
            },
            school: {
                name: school?.name || 'School',
                address: school?.location || '',
                phone: school?.contactNumber,
                email: null,
                logo: school?.profilePicture
            },
            employee: {
                name: profile.user?.name || 'Employee',
                employeeId: staff?.employeeId || profile.userId?.substring(0, 8),
                designation: staff?.designation || 'Staff',
                department: staff?.department?.name || 'General',
                panNumber: profile.panNumber,
                uanNumber: profile.uanNumber,
                bankName: profile.bankName,
                accountNumber: profile.accountNumber,
                ifscCode: profile.ifscCode
            },
            period: {
                month: item.period.month,
                year: item.period.year,
                startDate: item.period.startDate,
                endDate: item.period.endDate
            }
        };

        // Generate PDF
        const pdfBuffer = await generatePayslipPDF(pdfData);
        const filename = getPayslipFilename(pdfData.employee, pdfData.period);

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pdfBuffer.length.toString()
            }
        });

    } catch (error) {
        console.error('Teacher payslip PDF error:', error);
        return NextResponse.json({
            error: 'Failed to generate payslip PDF',
            details: error.message
        }, { status: 500 });
    }
}
