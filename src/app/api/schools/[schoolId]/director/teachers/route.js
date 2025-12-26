import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const type = searchParams.get('type'); // TEACHING_STAFF, NON_TEACHING_STAFF
        const status = searchParams.get('status') || 'ACTIVE';

        const cacheKey = generateKey('director:teachers', { schoolId, search, type, status });

        const data = await remember(cacheKey, async () => {
            const roleFilter = type
                ? { name: type }
                : { name: { in: ['TEACHING_STAFF', 'NON_TEACHING_STAFF'] } };

            const where = {
                schoolId,
                deletedAt: null,
                status: status,
                role: roleFilter,
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } }
                    ]
                })
            };

            const [teachers, teachingCount, nonTeachingCount, totalActive] = await Promise.all([
                prisma.user.findMany({
                    where,
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profilePicture: true,
                        status: true,
                        role: {
                            select: {
                                name: true
                            }
                        },
                        teachingStaff: {
                            select: {
                                employeeId: true,
                                department: true,
                                designation: true
                            }
                        },
                        nonTeachingStaff: {
                            select: {
                                employeeId: true,
                                department: true,
                                designation: true
                            }
                        }
                    },
                    orderBy: { name: 'asc' },
                    take: 100
                }),
                prisma.user.count({
                    where: {
                        schoolId,
                        deletedAt: null,
                        status: 'ACTIVE',
                        role: { name: 'TEACHING_STAFF' }
                    }
                }),
                prisma.user.count({
                    where: {
                        schoolId,
                        deletedAt: null,
                        status: 'ACTIVE',
                        role: { name: 'NON_TEACHING_STAFF' }
                    }
                }),
                prisma.user.count({
                    where: {
                        schoolId,
                        deletedAt: null,
                        status: 'ACTIVE',
                        role: { name: { in: ['TEACHING_STAFF', 'NON_TEACHING_STAFF'] } }
                    }
                })
            ]);

            return {
                summary: {
                    total: totalActive,
                    teaching: teachingCount,
                    nonTeaching: nonTeachingCount
                },
                teachers: teachers.map(t => ({
                    id: t.id,
                    name: t.name,
                    email: t.email,
                    profilePicture: t.profilePicture,
                    employeeId: t.teachingStaff?.employeeId || t.nonTeachingStaff?.employeeId,
                    department: t.teachingStaff?.department || t.nonTeachingStaff?.department,
                    designation: t.teachingStaff?.designation || t.nonTeachingStaff?.designation,
                    type: t.role.name,
                    status: t.status
                }))
            };
        }, 120);

        return NextResponse.json(data);
    } catch (error) {
        console.error('[DIRECTOR TEACHERS ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch teachers', details: error.message },
            { status: 500 }
        );
    }
}
