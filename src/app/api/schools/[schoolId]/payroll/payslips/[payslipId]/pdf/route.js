// Payslip PDF Download API
// GET /api/schools/[schoolId]/payroll/payslips/[payslipId]/pdf
// Downloads a professional PDF payslip

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generatePayslipPDF, getPayslipFilename } from '@/lib/payroll/generatePayslipPDF.jsx';

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, payslipId } = params;

    try {
        // Get payslip with all related data
        const payslip = await prisma.payslip.findUnique({
            where: { id: payslipId },
            include: {
                payrollItem: {
                    include: {
                        period: true,
                        employee: {
                            include: {
                                user: {
                                    select: { name: true, email: true }
                                }
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

        const payrollItem = payslip.payrollItem;
        const period = payrollItem.period;
        const employeeProfile = payrollItem.employee;

        // Verify school access
        if (period.schoolId !== schoolId) {
            return NextResponse.json({
                error: 'Unauthorized'
            }, { status: 403 });
        }

        // Get school details
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                id: true,
                name: true,
                address: true,
                contactNumber: true
            }
        });

        // Get teaching staff details for more info
        let staffDetails = await prisma.teachingStaff.findUnique({
            where: { userId: employeeProfile.userId },
            select: {
                employeeId: true,
                designation: true,
                department: { select: { name: true } }
            }
        });

        if (!staffDetails) {
            staffDetails = await prisma.nonTeachingStaff.findUnique({
                where: { userId: employeeProfile.userId },
                select: {
                    employeeId: true,
                    designation: true
                }
            });
        }

        // Prepare data for PDF
        const pdfData = {
            payslip: {
                id: payslip.id,
                earnings: payslip.earnings || [],
                deductions: payslip.deductions || [],
                grossSalary: payslip.grossSalary,
                totalDeductions: payslip.totalDeductions,
                netSalary: payslip.netSalary,
                workingDays: payrollItem.daysWorked
            },
            school: {
                name: school.name,
                address: school.address || '',
                contactNumber: school.contactNumber || ''
            },
            employee: {
                name: employeeProfile.user?.name || 'N/A',
                employeeId: staffDetails?.employeeId || employeeProfile.userId.substring(0, 8),
                designation: staffDetails?.designation || employeeProfile.employeeType,
                department: staffDetails?.department?.name || 'General',
                panNumber: employeeProfile.panNumber || 'N/A',
                bankName: employeeProfile.bankName || 'N/A',
                accountNumber: employeeProfile.accountNumber || 'N/A',
                ifscCode: employeeProfile.ifscCode || 'N/A'
            },
            period: {
                month: period.month,
                year: period.year,
                totalWorkingDays: period.totalWorkingDays
            }
        };

        // Generate PDF
        const pdfBuffer = await generatePayslipPDF(pdfData);
        const filename = getPayslipFilename(pdfData.employee, pdfData.period);

        // Return PDF
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pdfBuffer.length.toString()
            }
        });

    } catch (error) {
        console.error('Payslip PDF generation error:', error);
        return NextResponse.json({
            error: 'Failed to generate payslip PDF',
            details: error.message
        }, { status: 500 });
    }
}
