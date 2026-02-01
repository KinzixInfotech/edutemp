// Email Payslip API
// POST /api/schools/[schoolId]/payroll/payslips/[payslipId]/email

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generatePayslipPDF, getPayslipFilename } from '@/lib/payroll/generatePayslipPDF.jsx';
import { Resend } from 'resend';

// Initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req, props) {
    const params = await props.params;
    const { schoolId, payslipId } = params;

    try {
        // Check if email service is configured
        if (!resend) {
            return NextResponse.json({
                error: 'Email service not configured. Please set RESEND_API_KEY.'
            }, { status: 503 });
        }

        // Get payslip with all related data
        const payslip = await prisma.payslip.findUnique({
            where: { id: payslipId },
            include: {
                payrollItem: {
                    include: {
                        period: true,
                        employee: {
                            include: {
                                user: { select: { id: true, name: true, email: true } }
                            }
                        }
                    }
                }
            }
        });

        if (!payslip) {
            return NextResponse.json({
                error: 'Payslip not found'
            }, { status: 404 });
        }

        const item = payslip.payrollItem;
        const employee = item.employee;
        const userEmail = employee.user?.email;

        if (!userEmail) {
            return NextResponse.json({
                error: 'Employee email not found'
            }, { status: 400 });
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

        // Get staff details
        const staff = await prisma.teachingStaff.findUnique({
            where: { userId: employee.userId },
            select: {
                employeeId: true,
                designation: true,
                joiningDate: true,
                department: { select: { name: true } }
            }
        });

        // Build PDF data
        const earnings = [
            { label: 'Basic Salary', amount: item.basicEarned },
            { label: 'HRA', amount: item.hraEarned },
            { label: 'DA', amount: item.daEarned },
            { label: 'TA', amount: item.taEarned },
            { label: 'Medical', amount: item.medicalEarned },
            { label: 'Special', amount: item.specialEarned },
        ].filter(e => e.amount > 0);

        const deductions = [];
        if (item.pfEmployee > 0) deductions.push({ label: 'PF (Employee)', amount: item.pfEmployee });
        if (item.esiEmployee > 0) deductions.push({ label: 'ESI (Employee)', amount: item.esiEmployee });
        if (item.professionalTax > 0) deductions.push({ label: 'Professional Tax', amount: item.professionalTax });
        if (item.tds > 0) deductions.push({ label: 'TDS', amount: item.tds });
        if (item.loanDeduction > 0) deductions.push({ label: 'Loan EMI', amount: item.loanDeduction });
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
                name: employee.user?.name || 'Employee',
                employeeId: staff?.employeeId || employee.userId?.substring(0, 8),
                designation: staff?.designation || 'Employee',
                department: staff?.department?.name || 'General',
                joiningDate: staff?.joiningDate,
                panNumber: employee.panNumber,
                uanNumber: employee.uanNumber,
                bankName: employee.bankName,
                accountNumber: employee.accountNumber,
                ifscCode: employee.ifscCode
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

        const monthName = new Date(item.period.year, item.period.month - 1).toLocaleString('default', { month: 'long' });

        // Send email with PDF attachment
        const { data, error } = await resend.emails.send({
            from: `${school?.name || 'Edubreezy'} Payroll <payroll@edubreezy.com>`,
            to: userEmail,
            subject: `Payslip for ${monthName} ${item.period.year} - ${school?.name || 'School'}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #0469ff;">Salary Slip</h2>
                    <p>Dear ${employee.user?.name || 'Employee'},</p>
                    <p>Please find attached your payslip for <strong>${monthName} ${item.period.year}</strong>.</p>
                    
                    <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #666;">Gross Earnings</td>
                                <td style="padding: 8px 0; text-align: right; color: #22c55e; font-weight: bold;">₹${item.grossEarnings.toLocaleString('en-IN')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666;">Total Deductions</td>
                                <td style="padding: 8px 0; text-align: right; color: #ef4444; font-weight: bold;">₹${item.totalDeductions.toLocaleString('en-IN')}</td>
                            </tr>
                            <tr style="border-top: 1px solid #ddd;">
                                <td style="padding: 12px 0; font-weight: bold;">Net Pay</td>
                                <td style="padding: 12px 0; text-align: right; color: #0469ff; font-weight: bold; font-size: 18px;">₹${item.netSalary.toLocaleString('en-IN')}</td>
                            </tr>
                        </table>
                    </div>

                    <p style="color: #666; font-size: 14px;">
                        This is an auto-generated email from the Edubreezy payroll system.<br>
                        For any queries, please contact your school HR.
                    </p>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">
                        ${school?.name || 'School'}<br>
                        ${school?.email || ''}
                    </p>
                </div>
            `,
            attachments: [
                {
                    filename,
                    content: pdfBuffer.toString('base64'),
                    contentType: 'application/pdf'
                }
            ]
        });

        if (error) {
            console.error('Email send error:', error);
            return NextResponse.json({
                error: 'Failed to send email',
                details: error.message
            }, { status: 500 });
        }

        // Update payslip to mark as emailed
        await prisma.payslip.update({
            where: { id: payslipId },
            data: {
                emailedAt: new Date(),
                emailId: data?.id
            }
        });

        return NextResponse.json({
            success: true,
            message: `Payslip emailed to ${userEmail}`,
            emailId: data?.id
        });

    } catch (error) {
        console.error('Email payslip error:', error);
        return NextResponse.json({
            error: 'Failed to email payslip',
            details: error.message
        }, { status: 500 });
    }
}
