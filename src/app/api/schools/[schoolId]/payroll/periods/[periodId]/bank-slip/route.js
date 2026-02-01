// Bank Slip Download API
// GET /api/schools/[schoolId]/payroll/periods/[periodId]/bank-slip
// Downloads bank transfer file for approved payroll period

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateBankSlipData, toCSV, toExcelXML } from '@/lib/payroll/generateBankSlip';

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, periodId } = params;
    const { searchParams } = new URL(req.url);

    const format = searchParams.get('format') || 'csv'; // csv or excel

    try {
        // Get period with validation
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

        // Bank slip only for approved or paid periods
        if (!['APPROVED', 'PAID'].includes(period.status)) {
            return NextResponse.json({
                error: 'Bank slip can only be generated for approved or paid periods'
            }, { status: 400 });
        }

        // Get school details
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, name: true, schoolCode: true }
        });

        // Get payroll items with employee bank details (only READY employees)
        const payrollItems = await prisma.payrollItem.findMany({
            where: {
                periodId,
                paymentStatus: { in: ['PENDING', 'PROCESSING'] },
                readiness: 'READY' // Only include employees ready for payout
            },
            include: {
                employee: {
                    include: {
                        user: {
                            select: { name: true, email: true }
                        }
                    }
                }
            },
            orderBy: { employee: { user: { name: 'asc' } } }
        });

        // Also get count of excluded (on-hold) employees for info
        const excludedCount = await prisma.payrollItem.count({
            where: {
                periodId,
                readiness: { not: 'READY' }
            }
        });

        if (payrollItems.length === 0) {
            return NextResponse.json({
                error: 'No pending payments found for this period'
            }, { status: 400 });
        }

        // Generate bank slip data
        const { headers, rows, summary, filename } = generateBankSlipData(
            payrollItems,
            period,
            school
        );

        // DEBUG LOGGING
        console.log(`[Bank Slip] Period: ${period.month}/${period.year} (${period.status})`);
        console.log(`[Bank Slip] Total Items: ${summary.totalEmployees}`);
        console.log(`[Bank Slip] Valid (Included): ${rows.length}`);
        console.log(`[Bank Slip] Skipped - Zero Salary: ${summary.skippedZeroSalary}`);
        console.log(`[Bank Slip] Skipped - Missing Bank: ${summary.skippedMissingBank}`);

        // Check if any valid rows
        if (rows.length === 0) {
            let errorMessage = 'No eligible employees found for bank transfer.';

            if (summary.skippedZeroSalary > 0 && summary.skippedMissingBank === 0) {
                errorMessage = `No payable employees found. ${summary.skippedZeroSalary} employees have ₹0 net salary.`;
            } else if (summary.skippedMissingBank > 0) {
                errorMessage = `No valid bank details found. ${summary.skippedMissingBank} employees missing bank info.`;
            }

            return NextResponse.json({
                error: errorMessage,
                details: {
                    skippedZeroSalary: summary.skippedZeroSalary,
                    skippedMissingBank: summary.skippedMissingBank
                }
            }, { status: 400 });
        }

        let content;
        let contentType;
        let extension;

        if (format === 'excel') {
            content = toExcelXML(headers, rows, summary);
            contentType = 'application/vnd.ms-excel';
            extension = 'xls';
        } else {
            content = toCSV(headers, rows);
            contentType = 'text/csv';
            extension = 'csv';
        }

        // Update period to mark bank slip as generated
        await prisma.payrollPeriod.update({
            where: { id: periodId },
            data: {
                bankSlipGeneratedAt: new Date()
            }
        });

        // Return file download
        const finalFilename = filename.replace('.csv', `.${extension}`);

        return new NextResponse(content, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${finalFilename}"`,
                'X-Bank-Slip-Summary': JSON.stringify(summary)
            }
        });
    } catch (error) {
        console.error('Bank slip generation error:', error);
        return NextResponse.json({
            error: 'Failed to generate bank slip',
            details: error.message
        }, { status: 500 });
    }
}
