import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        // Validate schoolId
        if (!schoolId || schoolId === 'null' || schoolId === 'undefined') {
            return NextResponse.json(
                { error: 'Invalid schoolId', staff: [], summary: { total: 0, teaching: 0, nonTeaching: 0 } },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const type = searchParams.get('type'); // teaching, non-teaching
        const status = searchParams.get('status') || 'ACTIVE';

        const cacheKey = generateKey('director:teachers', { schoolId, search, type, status });

        const data = await remember(cacheKey, async () => {
            // Map frontend type to role name
            let roleFilter;
            if (type === 'teaching') {
                roleFilter = { name: 'TEACHING_STAFF' };
            } else if (type === 'non-teaching') {
                roleFilter = { name: 'NON_TEACHING_STAFF' };
            } else {
                roleFilter = { name: { in: ['TEACHING_STAFF', 'NON_TEACHING_STAFF'] } };
            }

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
                        // Use correct relation names from User model
                        teacher: {
                            select: {
                                employeeId: true,
                                designation: true,
                                departmentId: true
                            }
                        },
                        nonTeachingStaff: {
                            select: {
                                employeeId: true,
                                designation: true,
                                departmentId: true
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
                staff: teachers.map(t => ({
                    id: t.id,
                    name: t.name || '',
                    firstName: t.name?.split(' ')[0] || '',
                    lastName: t.name?.split(' ').slice(1).join(' ') || '',
                    email: t.email,
                    profilePicture: t.profilePicture,
                    employeeId: t.teacher?.employeeId || t.nonTeachingStaff?.employeeId || '',
                    designation: t.teacher?.designation || t.nonTeachingStaff?.designation || '',
                    type: t.role.name === 'TEACHING_STAFF' ? 'teaching' : 'non-teaching',
                    status: t.status?.toLowerCase() || 'active'
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
