import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Fetch global SMS logs with filters
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const status = searchParams.get('status');
        const schoolId = searchParams.get('schoolId');
        const templateId = searchParams.get('templateId');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const search = searchParams.get('search');

        // Build where clause
        const where = {};

        if (status) {
            where.status = status;
        }

        if (schoolId) {
            where.schoolId = schoolId;
        }

        if (templateId) {
            where.templateId = templateId;
        }

        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                where.createdAt.gte = new Date(dateFrom);
            }
            if (dateTo) {
                where.createdAt.lte = new Date(dateTo + 'T23:59:59');
            }
        }

        if (search) {
            where.OR = [
                { message: { contains: search, mode: 'insensitive' } },
                { recipients: { has: search } },
            ];
        }

        // Get total count
        const total = await prisma.smsLog.count({ where });

        // Get logs with pagination
        const logs = await prisma.smsLog.findMany({
            where,
            include: {
                school: {
                    select: { name: true },
                },
                template: {
                    select: { name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });

        // Format logs
        const formattedLogs = logs.map((log) => ({
            id: log.id,
            schoolId: log.schoolId,
            schoolName: log.school?.name,
            templateId: log.templateId,
            templateName: log.template?.name,
            recipients: log.recipients,
            message: log.message,
            status: log.status,
            cost: log.cost,
            fast2smsId: log.fast2smsId,
            errorMessage: log.errorMessage,
            createdAt: log.createdAt,
        }));

        // Get status stats
        const statusStats = await prisma.smsLog.groupBy({
            by: ['status'],
            where,
            _count: true,
        });

        const stats = {
            total,
            delivered: statusStats.find(s => s.status === 'DELIVERED')?._count || 0,
            sent: statusStats.find(s => s.status === 'SENT')?._count || 0,
            pending: statusStats.find(s => s.status === 'PENDING')?._count || 0,
            failed: statusStats.find(s => s.status === 'FAILED')?._count || 0,
        };

        return NextResponse.json({
            logs: formattedLogs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            stats,
        });
    } catch (error) {
        console.error('[SMS ADMIN LOGS ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch logs', details: error.message },
            { status: 500 }
        );
    }
}
