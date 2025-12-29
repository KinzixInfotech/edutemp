import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

// GET - Get SMS logs with filters
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        if (!schoolId || schoolId === 'null') {
            return NextResponse.json({ error: 'Invalid schoolId' }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const templateId = searchParams.get('templateId');
        const limit = parseInt(searchParams.get('limit')) || 50;
        const offset = parseInt(searchParams.get('offset')) || 0;

        const cacheKey = generateKey('sms:logs', { schoolId, status, templateId, limit, offset });

        const data = await remember(cacheKey, async () => {
            const where = { schoolId };
            if (status) where.status = status;
            if (templateId) where.templateId = templateId;

            const [logs, total] = await Promise.all([
                prisma.smsLog.findMany({
                    where,
                    include: {
                        template: {
                            select: { name: true, category: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset
                }),
                prisma.smsLog.count({ where })
            ]);

            return {
                logs: logs.map(log => ({
                    id: log.id,
                    template: log.template?.name || 'N/A',
                    category: log.template?.category || 'GENERAL',
                    recipientCount: log.recipients.length,
                    message: log.message,
                    status: log.status,
                    cost: log.cost,
                    errorMessage: log.errorMessage,
                    trigger: log.trigger,
                    createdAt: log.createdAt
                })),
                total,
                limit,
                offset
            };
        }, 30); // Cache for 30 seconds

        return NextResponse.json(data);
    } catch (error) {
        console.error('[SMS LOGS GET ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch logs', details: error.message },
            { status: 500 }
        );
    }
}
