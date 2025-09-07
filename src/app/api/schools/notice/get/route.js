import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import * as z from 'zod';

function normalizeParam(value) {
    if (value === null || value === 'null' || value === 'undefined' || value === '') {
        return undefined;
    }
    return value;
}

const fetchNoticesSchema = z.object({
    userId: z.string().uuid('Invalid user ID'),
    schoolId: z.string().uuid('Invalid school ID').optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    audience: z.enum(['ALL', 'STUDENTS', 'TEACHERS', 'PARENTS', 'CLASS', 'SECTION']).optional(),
    priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).optional(),
    publishedAtStart: z.string().datetime().optional(),
    publishedAtEnd: z.string().datetime().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
    offset: z.string().regex(/^\d+$/).transform(Number).optional().default('0'),
    sortBy: z.enum(['publishedAt', 'priority', 'title']).optional().default('publishedAt'),
    search: z.string().optional(),
    category: z.enum(['Academic', 'Events', 'General', 'Emergency', 'Others']).optional(),
});

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const parsed = fetchNoticesSchema.safeParse({
            userId: normalizeParam(searchParams.get('userId')),
            schoolId: normalizeParam(searchParams.get('schoolId')),
            status: normalizeParam(searchParams.get('status')),
            audience: normalizeParam(searchParams.get('audience')),
            priority: normalizeParam(searchParams.get('priority')),
            publishedAtStart: normalizeParam(searchParams.get('publishedAtStart')),
            publishedAtEnd: normalizeParam(searchParams.get('publishedAtEnd')),
            limit: normalizeParam(searchParams.get('limit')),
            offset: normalizeParam(searchParams.get('offset')),
            sortBy: normalizeParam(searchParams.get('sortBy')),
            search: normalizeParam(searchParams.get('search')),
            category: normalizeParam(searchParams.get('category')),
        });

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
        }

        const {
            userId,
            schoolId,
            status,
            audience,
            priority,
            publishedAtStart,
            publishedAtEnd,
            limit,
            offset,
            sortBy,
            search,
            category,
        } = parsed.data;

        // Fetch user to get role, classId, sectionId
        const user = await prisma.User.findUnique({
            where: { id: userId },
            select: { id: true, role: true, schoolId: true, },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // if (user.role === 'ADMIN') {
        //     return NextResponse.json({ error: 'Use admin endpoint for admins' }, { status: 403 });
        // }

        const now = new Date();
        const where = {
            schoolId: schoolId || user.schoolId,
            status: status || 'PUBLISHED',
            audience: audience
                ? { in: ['ALL', audience, "ALL" || ""] }
                : { in: ['ALL', "ALL"|| ""] },

            priority,
            // publishedAt: publishedAtStart && publishedAtEnd
            //     ? { gte: new Date(publishedAtStart), lte: new Date(publishedAtEnd) }
            //     : { lte: now },
            // OR: [
            //     { expiryDate: { gte: now } },
            //     { expiryDate: null },
            // ],
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            }),
            ...(category && { category }), // Assuming category field exists in Notice model
        };

        const [notices, total] = await Promise.all([
            prisma.notice.findMany({
                where,
                include: {
                    NoticeTarget: true,
                    Author: { select: { id: true, name: true } },
                    School: { select: { id: true, name: true } },
                },
                orderBy: sortBy === 'title' ? { title: 'asc' } : sortBy === 'priority' ? { priority: 'desc' } : { publishedAt: sortBy === 'publishedAt' ? 'desc' : 'asc' },
                take: limit,
                skip: offset,
            }),
            prisma.notice.count({ where }),
        ]);

        // Filter targeted notices for non-admins
        const targetedNotices = notices.filter((notice) => {
            if (notice.NoticeTarget.length === 0) {
                return true;
            }
            return notice.NoticeTarget.some((target) => {
                if (target.classId && user.classId && target.classId !== user.classId) return false;
                if (target.sectionId && user.sectionId && target.sectionId !== user.sectionId) return false;
                return true;
            });
        });

        return NextResponse.json({
            notices: targetedNotices,
            total,
            limit,
            offset,
        });
    } catch (error) {
        console.error('Error fetching noticeboard:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}