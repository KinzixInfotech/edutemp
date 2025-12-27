import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        // Validate schoolId
        if (!schoolId || schoolId === 'null' || schoolId === 'undefined') {
            return NextResponse.json(
                { error: 'Invalid schoolId', students: [], summary: { total: 0, active: 0, inactive: 0 }, classes: [], sections: [] },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const classId = searchParams.get('classId');
        const sectionId = searchParams.get('sectionId');
        const status = searchParams.get('status') || 'ACTIVE';

        // Redis cache key
        const cacheKey = generateKey('director:students', { schoolId, search, classId, sectionId, status });

        const data = await remember(cacheKey, async () => {
            const where = {
                schoolId,
                user: {
                    deletedAt: null,
                    status: status,
                    ...(search && {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } }
                        ]
                    })
                },
                ...(classId && { classId: parseInt(classId) }),
                ...(sectionId && { sectionId: parseInt(sectionId) })
            };

            const [students, totalCount, activeCount, classes, sections] = await Promise.all([
                prisma.student.findMany({
                    where,
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                profilePicture: true,
                                status: true
                            }
                        },
                        class: {
                            select: {
                                id: true,
                                className: true
                            }
                        },
                        section: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    },
                    orderBy: { admissionNo: 'asc' },
                    take: 100
                }),
                prisma.student.count({ where: { schoolId, user: { deletedAt: null } } }),
                prisma.student.count({ where: { schoolId, user: { deletedAt: null, status: 'ACTIVE' } } }),
                // Get all classes for filter dropdown
                prisma.class.findMany({
                    where: { schoolId },
                    select: { id: true, className: true },
                    orderBy: { className: 'asc' }
                }),
                // Get all sections for filter dropdown (optionally filtered by classId)
                prisma.section.findMany({
                    where: {
                        class: { schoolId },
                        ...(classId && { classId: parseInt(classId) })
                    },
                    select: { id: true, name: true, classId: true },
                    orderBy: { name: 'asc' }
                })
            ]);

            return {
                summary: {
                    total: totalCount,
                    active: activeCount,
                    inactive: totalCount - activeCount
                },
                classes: classes.map(c => ({ id: c.id, name: c.className })),
                sections: sections.map(s => ({ id: s.id, name: s.name, classId: s.classId })),
                students: students.map(s => ({
                    id: s.userId,
                    admissionNumber: s.admissionNo,
                    name: s.user.name || '',
                    firstName: s.user.name?.split(' ')[0] || '',
                    lastName: s.user.name?.split(' ').slice(1).join(' ') || '',
                    email: s.user.email,
                    profilePicture: s.user.profilePicture,
                    class: { id: s.classId, name: s.class?.className || '' },
                    section: { id: s.sectionId, name: s.section?.name || '' },
                    status: s.user.status?.toLowerCase() || 'active'
                }))
            };
        }, 120);

        return NextResponse.json(data);
    } catch (error) {
        console.error('[DIRECTOR STUDENTS ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch students', details: error.message },
            { status: 500 }
        );
    }
}
