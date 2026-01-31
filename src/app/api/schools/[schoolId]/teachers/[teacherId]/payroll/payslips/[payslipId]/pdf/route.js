// Teacher Payslip PDF Download API
// GET /api/schools/[schoolId]/teachers/[teacherId]/payroll/payslips/[payslipId]/pdf

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generatePayslipPDF, getPayslipFilename } from '@/lib/payroll/generatePayslipPDF.jsx';

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, teacherId, payslipId } = params;

    try {
        // Get the payslip with related data
        const payslip = await prisma.payslip.findUnique({
            where: { id: payslipId },
            include: {
                payrollItem: {
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
                }
            }
        });

        if (!payslip) {
            return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
        }

        // Verify the teacher has access to this payslip
        const employeeUserId = payslip.payrollItem.employee.userId;
        if (employeeUserId !== teacherId) {
            return NextResponse.json({ error: 'Unauthorized - this is not your payslip' }, { status: 403 });
        }

        // Get school details
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                name: true,
                address: true,
                city: true,
                state: true,
                pincode: true,
                phone: true,
                email: true,
                logo: true
            }
        });

        // Get staff details (teaching staff)
        const staff = await prisma.teachingStaff.findUnique({
            where: { userId: teacherId },
            select: {
                employeeId: true,
                designation: true,
                joiningDate: true,
                department: { select: { name: true } }
            }
        });

        const item = payslip.payrollItem;
        const profile = item.employee;

        // Build earnings array
        const earnings = [
            { label: 'Basic Salary', amount: item.basicEarned },
            { label: 'HRA', amount: item.hraEarned },
            { label: 'DA', amount: item.daEarned },
            { label: 'TA', amount: item.taEarned },
            { label: 'Medical', amount: item.medicalEarned },
            { label: 'Special', amount: item.specialEarned },
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
                daysWorked: item.daysWorked,
                daysAbsent: item.daysAbsent,
                totalWorkingDays: item.period.totalWorkingDays,
                grossEarnings: item.grossEarnings,
                totalDeductions: item.totalDeductions,
                netSalary: item.netSalary,
                earnings,
                deductions
            },
            school: {
                name: school?.name || 'School',
                address: [school?.address, school?.city, school?.state, school?.pincode].filter(Boolean).join(', '),
                phone: school?.phone,
                email: school?.email,
                logo: school?.logo
            },
            employee: {
                name: profile.user?.name || 'Employee',
                employeeId: staff?.employeeId || profile.userId?.substring(0, 8),
                designation: staff?.designation || 'Teacher',
                department: staff?.department?.name || 'General',
                joiningDate: staff?.joiningDate,
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
