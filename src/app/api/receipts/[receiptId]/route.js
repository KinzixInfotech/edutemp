import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateKey, getCache, setCache, delCache } from '@/lib/cache';

/**
 * Get receipt by ID
 * GET /api/receipts/[receiptId]
 */
export async function GET(request, { params }) {
    try {
        const { receiptId } = params;
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('schoolId');

        if (!schoolId) {
            return NextResponse.json(
                { error: 'schoolId is required' },
                { status: 400 }
            );
        }

        // Check cache first
        const cacheKey = generateKey('receipt', { receiptId });
        const cached = await getCache(cacheKey);
        if (cached) {
            return NextResponse.json(cached);
        }

        // Fetch from database
        const receipt = await prisma.receipt.findUnique({
            where: { id: receiptId },
            include: {
                feePayment: {
                    select: {
                        amount: true,
                        paymentDate: true,
                        paymentMethod: true,
                        status: true,
                    },
                },
                student: {
                    select: {
                        admissionNo: true,
                        user: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!receipt) {
            return NextResponse.json(
                { error: 'Receipt not found' },
                { status: 404 }
            );
        }

        if (receipt.schoolId !== schoolId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const response = {
            id: receipt.id,
            receiptNumber: receipt.receiptNumber,
            receiptData: receipt.receiptData,
            pdfUrl: receipt.pdfUrl,
            pdfGenerated: receipt.pdfGenerated,
            createdAt: receipt.createdAt,
            feePayment: receipt.feePayment,
            student: receipt.student,
        };

        // Cache for 7 days (receipts don't change)
        await setCache(cacheKey, response, 604800);

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error fetching receipt:', error);
        return NextResponse.json(
            { error: 'Failed to fetch receipt', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * Update receipt (mainly for PDF URL after upload)
 * PATCH /api/receipts/[receiptId]
 */
export async function PATCH(request, { params }) {
    try {
        const { receiptId } = params;
        const body = await request.json();
        const { pdfUrl, schoolId } = body;

        if (!schoolId || !pdfUrl) {
            return NextResponse.json(
                { error: 'schoolId and pdfUrl are required' },
                { status: 400 }
            );
        }

        // Verify receipt belongs to school
        const receipt = await prisma.receipt.findUnique({
            where: { id: receiptId },
            select: { schoolId: true },
        });

        if (!receipt) {
            return NextResponse.json(
                { error: 'Receipt not found' },
                { status: 404 }
            );
        }

        if (receipt.schoolId !== schoolId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Update receipt with PDF URL
        const updatedReceipt = await prisma.receipt.update({
            where: { id: receiptId },
            data: {
                pdfUrl,
                pdfGenerated: true,
            },
        });

        // Invalidate cache
        const cacheKey = generateKey('receipt', { receiptId });
        await delCache(cacheKey);

        return NextResponse.json({
            success: true,
            receipt: updatedReceipt,
        });

    } catch (error) {
        console.error('Error updating receipt:', error);
        return NextResponse.json(
            { error: 'Failed to update receipt', details: error.message },
            { status: 500 }
        );
    }
}
