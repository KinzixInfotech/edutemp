
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import * as z from 'zod';
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

// Validation schemas
const createNoticeSchema = z.object({
    schoolId: z.string().uuid('Invalid school ID'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    fileUrl: z.string().optional(),
    audience: z.enum(['ALL', 'STUDENTS', 'TEACHERS', 'PARENTS', 'CLASS', 'SECTION'], {
        errorMap: () => ({ message: 'Invalid audience' }),
    }),
    priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT'], {
        errorMap: () => ({ message: 'Invalid priority' }),
    }),
    status: z.enum(['DRAFT', 'PUBLISHED'], {
        errorMap: () => ({ message: 'Status must be DRAFT or PUBLISHED' }),
    }),
    publishedAt: z.string().datetime().optional(),
    expiryDate: z.string().datetime().optional(),
    createdById: z.string().uuid('Invalid creator ID').optional(),
});

const updateNoticeSchema = createNoticeSchema.partial().extend({
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'], {
        errorMap: () => ({ message: 'Invalid status' }),
    }),
});
function normalizeParam(value) {
    if (value === null || value === 'null' || value === 'undefined' || value === '') {
        return undefined;
    }
    return value;
}

const markImportantSchema = z.object({
    priority: z.enum(['IMPORTANT', 'URGENT'], {
        errorMap: () => ({ message: 'Priority must be IMPORTANT or URGENT' }),
    }),
});

const fetchNoticesSchema = z.object({
    schoolId: z.string().uuid('Invalid school ID').optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    audience: z.enum(['ALL', 'STUDENTS', 'TEACHERS', 'PARENTS', 'CLASS', 'SECTION']).optional(),
    priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).optional(),
    publishedAtStart: z.string().datetime().optional(),
    publishedAtEnd: z.string().datetime().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
    offset: z.string().regex(/^\d+$/).transform(Number).optional().default('0'),
    sortBy: z.enum(['publishedAt', 'priority', 'createdAt']).optional().default('createdAt'),
});

// POST /api/notices - Create a new notice
export async function POST(request) {
    try {
        const body = await request.json();
        const parsed = createNoticeSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
        }

        const {
            schoolId,
            title,
            description,
            fileUrl,
            audience,
            priority,
            status,
            publishedAt,
            expiryDate,
            createdById,
        } = parsed.data;

        const notice = await prisma.notice.create({
            data: {
                schoolId,
                title,
                description,
                fileUrl: fileUrl || null,
                audience,
                priority,
                status,
                publishedAt: publishedAt ? new Date(publishedAt) : null,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                createdById: createdById || 'placeholder-user-id', // Replace with auth user ID
            },
            include: {
                School: { select: { id: true, name: true } },
                Author: { select: { id: true, name: true } },
            },
        });

        await invalidatePattern('notices:*');

        return NextResponse.json(notice, { status: 201 });
    } catch (error) {
        console.error('Error creating notice:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Example POST Response (Success):
// {
//   "id": "550e8400-e29b-41d4-a716-446655440000",
//   "schoolId": "123e4567-e89b-12d3-a456-426614174000",
//   "title": "School Assembly",
//   "description": "Annual assembly on Friday",
//   "fileUrl": "/uploads/assembly.pdf",
//   "audience": "ALL",
//   "priority": "NORMAL",
//   "status": "PUBLISHED",
//   "publishedAt": "2025-09-07T00:00:00.000Z",
//   "expiryDate": null,
//   "createdById": "placeholder-user-id",
//   "createdAt": "2025-09-07T01:02:00.000Z",
//   "updatedAt": "2025-09-07T01:02:00.000Z",
//   "School": { "id": "123e4567-e89b-12d3-a456-426614174000", "name": "Example School" },
//   "Author": { "id": "placeholder-user-id", "name": "Admin User" }
// }

// Example POST Response (Error):
// {
//   "error": [
//     { "code": "too_small", "minimum": 1, "type": "string", "path": ["title"], "message": "Title is required" }
//   ]
// }

// PUT /api/notices/[id] - Update a notice
export async function PUT(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id || !z.string().uuid().safeParse(id).success) {
            return NextResponse.json({ error: 'Invalid notice ID' }, { status: 400 });
        }

        const body = await request.json();
        const parsed = updateNoticeSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
        }

        const notice = await prisma.notice.update({
            where: { id },
            data: {
                schoolId: parsed.data.schoolId,
                title: parsed.data.title,
                description: parsed.data.description,
                fileUrl: parsed.data.fileUrl,
                audience: parsed.data.audience,
                priority: parsed.data.priority,
                status: parsed.data.status,
                publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : undefined,
                expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : undefined,
                createdById: parsed.data.createdById,
            },
            include: {
                School: { select: { id: true, name: true } },
                Author: { select: { id: true, name: true } },
            },
        });

        await invalidatePattern('notices:*');

        return NextResponse.json(notice);
    } catch (error) {
        console.error('Error updating notice:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Example PUT Response (Success):
// {
//   "id": "550e8400-e29b-41d4-a716-446655440000",
//   "schoolId": "123e4567-e89b-12d3-a456-426614174000",
//   "title": "Updated School Assembly",
//   "description": "Updated details for assembly",
//   "fileUrl": "/uploads/updated-assembly.pdf",
//   "audience": "STUDENTS",
//   "priority": "IMPORTANT",
//   "status": "PUBLISHED",
//   "publishedAt": "2025-09-07T00:00:00.000Z",
//   "expiryDate": "2025-09-14T00:00:00.000Z",
//   "createdById": "placeholder-user-id",
//   "createdAt": "2025-09-07T01:02:00.000Z",
//   "updatedAt": "2025-09-07T02:00:00.000Z",
//   "School": { "id": "123e4567-e89b-12d3-a456-426614174000", "name": "Example School" },
//   "Author": { "id": "placeholder-user-id", "name": "Admin User" }
// }

// Example PUT Response (Error):
// {
//   "error": "Invalid notice ID"
// }

// DELETE /api/notices/[id] - Delete a notice (soft or hard delete)
export async function DELETE(request) {
    try {

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id || !z.string().uuid().safeParse(id).success) {
            return NextResponse.json({ error: 'Invalid notice ID' }, { status: 400 });
        }

        const hardDelete = searchParams.get('hard') === 'true';

        if (hardDelete) {
            await prisma.notice.delete({ where: { id } });
        } else {
            await prisma.notice.update({
                where: { id },
                data: { status: 'ARCHIVED' },
            });
        }

        await invalidatePattern('notices:*');

        return NextResponse.json({ message: 'Notice deleted successfully' });
    } catch (error) {
        console.error('Error deleting notice:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Example DELETE Response (Success):
// {
//   "message": "Notice deleted successfully"
// }

// Example DELETE Response (Error):
// {
//   "error": "Invalid notice ID"
// }

// GET /api/notices - Fetch notices with filters, pagination, and sorting
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        const parsed = fetchNoticesSchema.safeParse({
            schoolId: normalizeParam(searchParams.get('schoolId')),
            status: normalizeParam(searchParams.get('status')),
            audience: normalizeParam(searchParams.get('audience')),
            priority: normalizeParam(searchParams.get('priority')),
            publishedAtStart: normalizeParam(searchParams.get('publishedAtStart')),
            publishedAtEnd: normalizeParam(searchParams.get('publishedAtEnd')),
            limit: normalizeParam(searchParams.get('limit')),
            offset: normalizeParam(searchParams.get('offset')),
            sortBy: normalizeParam(searchParams.get('sortBy')),
        });
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
        }

        const {
            schoolId,
            status,
            audience,
            priority,
            publishedAtStart,
            publishedAtEnd,
            limit,
            offset,
            sortBy,
        } = parsed.data;

        const cacheKey = generateKey('notices:list', { schoolId, status, audience, priority, publishedAtStart, publishedAtEnd, limit, offset, sortBy });

        const result = await remember(cacheKey, async () => {
            const where = {
                schoolId,
                status,
                audience,
                priority,
                publishedAt: publishedAtStart && publishedAtEnd
                    ? { gte: new Date(publishedAtStart), lte: new Date(publishedAtEnd) }
                    : undefined,
            };

            const [notices, total] = await Promise.all([
                prisma.notice.findMany({
                    where,
                    include: {
                        School: { select: { id: true, name: true } },
                        Author: { select: { id: true, name: true } },
                    },
                    orderBy: { [sortBy]: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                prisma.notice.count({ where }),
            ]);

            return {
                notices,
                total,
                limit,
                offset,
            };
        }, 300); // 5 minutes cache

        // Return notices array for backward compatibility
        return NextResponse.json(result.notices);
    } catch (error) {
        console.error('Error fetching notices:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Example GET Response (Success):
// {
//   "notices": [
//     {
//       "id": "550e8400-e29b-41d4-a716-446655440000",
//       "schoolId": "123e4567-e89b-12d3-a456-426614174000",
//       "title": "School Assembly",
//       "description": "Annual assembly on Friday",
//       "fileUrl": "/uploads/assembly.pdf",
//       "audience": "ALL",
//       "priority": "NORMAL",
//       "status": "PUBLISHED",
//       "publishedAt": "2025-09-07T00:00:00.000Z",
//       "expiryDate": null,
//       "createdById": "placeholder-user-id",
//       "createdAt": "2025-09-07T01:02:00.000Z",
//       "updatedAt": "2025-09-07T01:02:00.000Z",
//       "School": { "id": "123e4567-e89b-12d3-a456-426614174000", "name": "Example School" },
//       "Author": { "id": "placeholder-user-id", "name": "Admin User" }
//     }
//   ],
//   "total": 1,
//   "limit": 10,
//   "offset": 0
// }

// Example GET Response (Error):
// {
//   "error": [
//     { "code": "invalid_string", "validation": "uuid", "path": ["schoolId"], "message": "Invalid school ID" }
//   ]
// }

// PATCH /api/notices/[id]/mark-important - Mark a notice as IMPORTANT or URGENT
export async function PATCH(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id || !z.string().uuid().safeParse(id).success) {
            return NextResponse.json({ error: 'Invalid notice ID' }, { status: 400 });
        }

        const body = await request.json();
        const parsed = markImportantSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
        }

        const notice = await prisma.notice.update({
            where: { id },
            data: { priority: parsed.data.priority },
            include: {
                School: { select: { id: true, name: true } },
                Author: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json(notice);
    } catch (error) {
        console.error('Error marking notice as important:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Example PATCH Response (Success):
// {
//   "id": "550e8400-e29b-41d4-a716-446655440000",
//   "schoolId": "123e4567-e89b-12d3-a456-426614174000",
//   "title": "School Assembly",
//   "description": "Annual assembly on Friday",
//   "fileUrl": "/uploads/assembly.pdf",
//   "audience": "ALL",
//   "priority": "IMPORTANT",
//   "status": "PUBLISHED",
//   "publishedAt": "2025-09-07T00:00:00.000Z",
//   "expiryDate": null,
//   "createdById": "placeholder-user-id",
//   "createdAt": "2025-09-07T01:02:00.000Z",
//   "updatedAt": "2025-09-07T02:00:00.000Z",
//   "School": { "id": "123e4567-e89b-12d3-a456-426614174000", "name": "Example School" },
//   "Author": { "id": "placeholder-user-id", "name": "Admin User" }
// }

// Example PATCH Response (Error):
// {
//   "error": [
//     { "code": "invalid_enum_value", "path": ["priority"], "message": "Priority must be IMPORTANT or URGENT" }
//   ]
// }
