import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const classId = searchParams.get('classId');
        const status = searchParams.get('status') || 'ACTIVE';

        // Redis cache key
        const cacheKey = generateKey('director:students', { schoolId, search, classId, status });

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
                ...(classId && { classId: parseInt(classId) })
            };

            const [students, totalCount, activeCount] = await Promise.all([
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
                                name: true
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
                prisma.student.count({ where: { schoolId, user: { deletedAt: null, status: 'ACTIVE' } } })
            ]);

            return {
                summary: {
                    total: totalCount,
                    active: activeCount,
                    inactive: totalCount - activeCount
                },
                students: students.map(s => ({
                    id: s.userId,
                    admissionNo: s.admissionNo,
                    name: s.user.name,
                    email: s.user.email,
                    profilePicture: s.user.profilePicture,
                    class: s.class?.name,
                    section: s.section?.name,
                    status: s.user.status
                }))
            };
        }, 120); // 2 min cache

        return NextResponse.json(data);
    } catch (error) {
        console.error('[DIRECTOR STUDENTS ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch students', details: error.message },
            { status: 500 }
        );
    }
}
