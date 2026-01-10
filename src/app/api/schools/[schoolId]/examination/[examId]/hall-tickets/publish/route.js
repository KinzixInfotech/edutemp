// app/api/schools/[schoolId]/examination/[examId]/hall-tickets/publish/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from '@/lib/cache';

// POST - Publish hall tickets (freeze exam data)
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId, examId } = params;

    try {
        const body = await req.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        // Get all issued hall tickets for this exam
        const issuedTickets = await prisma.admitCard.findMany({
            where: {
                examId,
                schoolId,
                status: 'ISSUED'
            }
        });

        if (issuedTickets.length === 0) {
            return NextResponse.json({
                error: 'No issued hall tickets found. Issue tickets before publishing.'
            }, { status: 400 });
        }

        // Update all issued tickets to PUBLISHED
        const publishResult = await prisma.admitCard.updateMany({
            where: {
                examId,
                schoolId,
                status: 'ISSUED'
            },
            data: {
                status: 'PUBLISHED',
                isPublished: true,
                publishedAt: new Date()
            }
        });

        // Invalidate cache
        await invalidatePattern(`hall-tickets:${schoolId}:*`);

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'UPDATE',
                tableName: 'AdmitCard',
                rowId: examId,
                newData: { action: 'PUBLISH', count: publishResult.count }
            }
        });

        return NextResponse.json({
            success: true,
            message: `${publishResult.count} hall ticket(s) published successfully`,
            publishedCount: publishResult.count
        });
    } catch (error) {
        console.error('Hall ticket publish error:', error);
        return NextResponse.json({ error: 'Failed to publish hall tickets' }, { status: 500 });
    }
}
