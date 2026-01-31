// Bulk Payslip Download API
// GET /api/schools/[schoolId]/payroll/payslips/bulk-download
// Downloads multiple payslips as a ZIP file

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generatePayslipPDF } from '@/lib/payroll/generatePayslipPDF.jsx';
import archiver from 'archiver';
import { Readable, PassThrough } from 'stream';

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const periodId = searchParams.get('periodId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!periodId && (!month || !year)) {
        return NextResponse.json({
            error: 'Either periodId or month/year is required'
        }, { status: 400 });
    }

    try {
        // Get school details first
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                id: true,
                name: true,
                location: true,
                contactNumber: true,
                profilePicture: true,
                signatureUrl: true,
                stampUrl: true
            }
        });

        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        // Get payroll period
        let period;
        if (periodId) {
            period = await prisma.payrollPeriod.findUnique({
                where: { id: periodId }
            });
        } else {
            period = await prisma.payrollPeriod.findUnique({
                where: {
                    schoolId_month_year: {
                        schoolId,
                        month: parseInt(month),
                        year: parseInt(year)
                    }
                }
            });
        }

        if (!period) {
            return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 });
        }

        if (period.schoolId !== schoolId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (!['APPROVED', 'PAID'].includes(period.status)) {
            return NextResponse.json({
                error: 'Payroll must be approved before downloading payslips'
            }, { status: 400 });
        }

        // Get all payroll items for this period
        const payrollItems = await prisma.payrollItem.findMany({
            where: { periodId: period.id },
            include: {
                employee: {
                    include: {
                        user: {
                            select: { name: true, email: true }
                        }
                    }
                }
            }
        });

        if (payrollItems.length === 0) {
            return NextResponse.json({
                error: 'No payroll items found for this period'
            }, { status: 404 });
        }

        // Create ZIP archive
        const archive = archiver('zip', { zlib: { level: 5 } });
        const passthrough = new PassThrough();
        archive.pipe(passthrough);

        const monthName = new Date(period.year, period.month - 1).toLocaleString('default', { month: 'long' });

        // Generate PDFs for each employee
        for (const item of payrollItems) {
            try {
                const employeeProfile = item.employee;

                // Get staff details
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

                // Build earnings array
                const earnings = [];
                if (item.basicEarned > 0) earnings.push({ name: 'Basic Salary', amount: item.basicEarned });
                if (item.hraEarned > 0) earnings.push({ name: 'HRA', amount: item.hraEarned });
                if (item.daEarned > 0) earnings.push({ name: 'DA', amount: item.daEarned });
                if (item.taEarned > 0) earnings.push({ name: 'TA', amount: item.taEarned });
                if (item.medicalEarned > 0) earnings.push({ name: 'Medical', amount: item.medicalEarned });
                if (item.specialEarned > 0) earnings.push({ name: 'Special Allowance', amount: item.specialEarned });
                if (item.overtimeEarned > 0) earnings.push({ name: 'Overtime', amount: item.overtimeEarned });
                if (item.incentives > 0) earnings.push({ name: 'Incentives', amount: item.incentives });
                if (item.arrears > 0) earnings.push({ name: 'Arrears', amount: item.arrears });

                // Build deductions array
                const deductions = [];
                if (item.pfEmployee > 0) deductions.push({ name: 'PF (Employee)', amount: item.pfEmployee });
                if (item.esiEmployee > 0) deductions.push({ name: 'ESI (Employee)', amount: item.esiEmployee });
                if (item.professionalTax > 0) deductions.push({ name: 'Professional Tax', amount: item.professionalTax });
                if (item.tds > 0) deductions.push({ name: 'TDS', amount: item.tds });
                if (item.loanDeduction > 0) deductions.push({ name: 'Loan Deduction', amount: item.loanDeduction });
                if (item.advanceDeduction > 0) deductions.push({ name: 'Advance Deduction', amount: item.advanceDeduction });
                if (item.lossOfPay > 0) deductions.push({ name: 'Loss of Pay', amount: item.lossOfPay });

                const pdfData = {
                    payslip: {
                        id: item.id,
                        earnings,
                        deductions,
                        grossSalary: item.grossEarnings,
                        totalDeductions: item.totalDeductions,
                        netSalary: item.netSalary,
                        workingDays: item.daysWorked
                    },
                    school: {
                        name: school.name,
                        address: school.location || '',
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

                const pdfBuffer = await generatePayslipPDF(pdfData);
                const safeName = (pdfData.employee.name || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
                const filename = `${safeName}_${pdfData.employee.employeeId}.pdf`;

                archive.append(pdfBuffer, { name: filename });
            } catch (pdfError) {
                console.error(`Error generating PDF for employee ${item.employeeId}:`, pdfError);
                // Continue with other payslips
            }
        }

        // Finalize archive
        await archive.finalize();

        // Convert passthrough stream to readable
        const chunks = [];
        for await (const chunk of passthrough) {
            chunks.push(chunk);
        }
        const zipBuffer = Buffer.concat(chunks);

        const zipFilename = `Payslips_${monthName}_${period.year}.zip`;

        return new NextResponse(zipBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${zipFilename}"`,
                'Content-Length': zipBuffer.length.toString()
            }
        });

    } catch (error) {
        console.error('Bulk payslip download error:', error);
        return NextResponse.json({
            error: 'Failed to generate bulk payslips',
            details: error.message
        }, { status: 500 });
    }
}
