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

        const now = new Date();
        // Determine allowed audiences based on user role
        const roleName = user.role?.name;
        let allowedAudiences = ['ALL'];

        if (roleName === 'ADMIN' || roleName === 'SUPER_ADMIN' || roleName === 'MASTER_ADMIN') {
            allowedAudiences = ['ALL', 'STAFF', 'TEACHERS', 'STUDENTS', 'PARENTS'];
        } else if (roleName === 'TEACHER' || roleName === 'TEACHING_STAFF') {
            allowedAudiences = ['ALL', 'STAFF', 'TEACHERS'];
        } else if (roleName === 'STUDENT') {
            allowedAudiences = ['ALL', 'STUDENTS'];
        } else if (roleName === 'PARENT') {
            allowedAudiences = ['ALL', 'PARENTS'];
        } else {
            // Default for other staff
            allowedAudiences = ['ALL', 'STAFF'];
        }

        const where = {
            schoolId: schoolId || user.schoolId,
            status: status || 'PUBLISHED',
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            }),
            ...(category && { category }),
            ...(priority && { priority }),
        };

        if (audience) {
            where.audience = audience;
        } else {
            where.OR = [
                { audience: { in: allowedAudiences } },
                { createdById: userId }
            ];
        }

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