import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateKey, getCache, setCache } from '@/lib/cache';

/**
 * Get all receipts for a student
 * GET /api/receipts/student/[studentId]
 */
export async function GET(request, { params }) {
    try {
        const { studentId } = params;
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('schoolId');

        if (!schoolId) {
            return NextResponse.json(
                { error: 'schoolId is required' },
                { status: 400 }
            );
        }

        // Check cache first
        const cacheKey = generateKey('student-receipts', { studentId, schoolId });
        const cached = await getCache(cacheKey);
        if (cached) {
            return NextResponse.json(cached);
        }

        // Fetch from database
        const receipts = await prisma.receipt.findMany({
            where: {
                studentId,
                schoolId,
            },
            include: {
                feePayment: {
                    select: {
                        amount: true,
                        paymentDate: true,
                        paymentMethod: true,
                        status: true,
                        transactionId: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const response = {
            receipts: receipts.map(receipt => ({
                id: receipt.id,
                receiptNumber: receipt.receiptNumber,
                pdfUrl: receipt.pdfUrl,
                pdfGenerated: receipt.pdfGenerated,
                createdAt: receipt.createdAt,
                amount: receipt.feePayment.amount,
                paymentDate: receipt.feePayment.paymentDate,
                paymentMethod: receipt.feePayment.paymentMethod,
                transactionId: receipt.feePayment.transactionId,
            })),
        };

        // Cache for 1 hour
        await setCache(cacheKey, response, 3600);

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error fetching student receipts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch receipts', details: error.message },
            { status: 500 }
        );
    }
}
