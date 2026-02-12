import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateReceiptNumber } from '@/lib/receipts/receipt-number-generator';
import { generateKey, setCache, delCache } from '@/lib/cache';
import { utapi } from '@/lib/server-uploadthing';

/**
 * Generate receipt for a fee payment
 * POST /api/receipts/generate
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { feePaymentId, schoolId } = body;

        if (!feePaymentId || !schoolId) {
            return NextResponse.json(
                { error: 'feePaymentId and schoolId are required' },
                { status: 400 }
            );
        }

        // Fetch payment details with all relations
        const payment = await prisma.feePayment.findUnique({
            where: { id: feePaymentId },
            include: {
                student: {
                    include: {
                        user: true,
                        class: true,
                        section: true,
                        parent: true,
                    },
                },
                studentFee: {
                    include: {
                        feeStructure: true,
                        particulars: {
                            orderBy: { name: 'asc' },
                        },
                    },
                },
                school: true,
                academicYear: true,
            },
        });

        if (!payment) {
            return NextResponse.json(
                { error: 'Payment not found' },
                { status: 404 }
            );
        }

        if (payment.schoolId !== schoolId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Fetch fee settings
        const feeSettings = await prisma.feeSettings.findUnique({
            where: { schoolId },
        });

        // Generate unique receipt number
        const receiptNumber = await generateReceiptNumber(
            schoolId,
            feeSettings?.receiptPrefix || 'REC'
        );

        // Build fee items from student fee particulars (fee head breakup)
        let feeItems = [];
        const particulars = payment.studentFee?.particulars || [];
        if (particulars.length > 0) {
            feeItems = particulars.map(p => ({
                description: p.name,
                amount: p.amount,
            }));
        } else {
            // Fallback to single line item
            feeItems = [{
                description: payment.studentFee?.feeStructure?.name || 'Fee Payment',
                amount: payment.amount,
            }];
        }

        // Calculate balance
        const totalFee = payment.studentFee?.finalAmount || payment.amount;
        const totalPaidSoFar = payment.studentFee?.paidAmount || payment.amount;
        const balanceAfterPayment = totalFee - totalPaidSoFar;

        // Prepare receipt data snapshot
        const receiptData = {
            // School Info
            schoolName: payment.school.name,
            schoolLogo: payment.school.profilePicture,
            schoolAddress: payment.school.location,
            schoolContact: payment.school.contactNumber,
            schoolEmail: payment.school.email || '',

            // Receipt Info
            receiptNumber,
            receiptDate: new Date().toLocaleDateString('en-IN'),

            // Student Info
            studentName: payment.student.user.name,
            studentClass: `${payment.student.class?.name || ''}-${payment.student.section?.name || ''}`,
            admissionNo: payment.student.admissionNo,

            // Parent Info
            parentName: payment.student.parent?.name || 'N/A',
            parentContact: payment.student.parent?.contactNumber || 'N/A',

            // Payment Info
            paymentId: payment.id,
            academicYear: payment.academicYear?.name || '',
            paymentDate: payment.paymentDate.toLocaleDateString('en-IN'),
            paymentMethod: payment.paymentMethod,
            transactionId: payment.transactionId || payment.gatewayPaymentId || 'N/A',

            // Fee Items (individual fee heads)
            feeItems,

            // Amounts
            subtotal: payment.amount,
            discount: 0,
            totalPaid: payment.amount,
            balanceAfterPayment: Math.max(0, balanceAfterPayment),

            // Display Settings
            showSchoolLogo: feeSettings?.showSchoolLogo ?? true,
            showBalanceDue: feeSettings?.showBalanceDue ?? true,
            showPaymentMode: feeSettings?.showPaymentMode ?? true,
            showSignatureLine: feeSettings?.showSignatureLine ?? true,
            paperSize: feeSettings?.receiptPaperSize || 'a4',
            footerText: feeSettings?.receiptFooterText || '',
        };

        // Create receipt record
        const receipt = await prisma.receipt.create({
            data: {
                schoolId,
                receiptNumber,
                feePaymentId,
                studentId: payment.studentId,
                parentId: payment.student.parentId,
                receiptData,
                pdfGenerated: false, // Will be updated after PDF generation
            },
        });

        // Generate filename for UploadThing
        // Format: studentName_academicYear_orderID_date.pdf
        const studentName = payment.student.user.name.replace(/\s+/g, '_');
        const academicYear = payment.academicYear?.name?.replace(/\s+/g, '_') || 'current';
        const orderId = payment.gatewayOrderId || payment.id.substring(0, 8);
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `${studentName}_${academicYear}_${orderId}_${date}.pdf`;

        // Note: Actual PDF generation will be done on the client side or via a separate service
        // The client will upload the generated PDF using the feeReceiptUploader endpoint
        // For now, we return the receipt data for client-side PDF generation

        // Invalidate cache
        await delCache(generateKey('student-receipts', { studentId: payment.studentId }));

        return NextResponse.json({
            success: true,
            receipt: {
                id: receipt.id,
                receiptNumber: receipt.receiptNumber,
                receiptData: receipt.receiptData,
                suggestedFilename: filename,
            },
            uploadMetadata: {
                paymentId: feePaymentId,
                schoolId,
            },
        });

    } catch (error) {
        console.error('Receipt generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate receipt', details: error.message },
            { status: 500 }
        );
    }
}
