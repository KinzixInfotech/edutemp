import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        // Validate schoolId
        if (!schoolId || schoolId === 'null' || schoolId === 'undefined') {
            return NextResponse.json(
                { error: 'Invalid schoolId', staff: [], summary: { total: 0, teaching: 0, nonTeaching: 0, onLeave: 0 } },
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

            // Handle special ON_LEAVE status
            if (status === 'ON_LEAVE') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Find all approved leave requests that are active today
                const activeLeaves = await prisma.leaveRequest.findMany({
                    where: {
                        schoolId,
                        status: 'APPROVED',
                        startDate: { lte: today },
                        endDate: { gte: today },
                        user: {
                            deletedAt: null,
                            role: roleFilter,
                            ...(search && {
                                OR: [
                                    { name: { contains: search, mode: 'insensitive' } },
                                    { email: { contains: search, mode: 'insensitive' } }
                                ]
                            })
                        }
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                profilePicture: true,
                                status: true,
                                role: { select: { name: true } },
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
                            }
                        }
                    },
                    orderBy: { endDate: 'asc' }
                });

                // Get unique users (in case someone has multiple leaves)
                const uniqueUsers = new Map();
                activeLeaves.forEach(leave => {
                    if (!uniqueUsers.has(leave.user.id)) {
                        uniqueUsers.set(leave.user.id, {
                            ...leave.user,
                            leaveType: leave.leaveType,
                            leaveEndDate: leave.endDate
                        });
                    }
                });

                const onLeaveStaff = Array.from(uniqueUsers.values());

                // Get counts
                const [teachingCount, nonTeachingCount, totalActive, onLeaveCount] = await Promise.all([
                    prisma.user.count({
                        where: { schoolId, deletedAt: null, status: 'ACTIVE', role: { name: 'TEACHING_STAFF' } }
                    }),
                    prisma.user.count({
                        where: { schoolId, deletedAt: null, status: 'ACTIVE', role: { name: 'NON_TEACHING_STAFF' } }
                    }),
                    prisma.user.count({
                        where: { schoolId, deletedAt: null, status: 'ACTIVE', role: { name: { in: ['TEACHING_STAFF', 'NON_TEACHING_STAFF'] } } }
                    }),
                    prisma.leaveRequest.groupBy({
                        by: ['userId'],
                        where: {
                            schoolId,
                            status: 'APPROVED',
                            startDate: { lte: today },
                            endDate: { gte: today },
                            user: { deletedAt: null, role: { name: { in: ['TEACHING_STAFF', 'NON_TEACHING_STAFF'] } } }
                        }
                    }).then(result => result.length)
                ]);

                return {
                    summary: {
                        total: totalActive,
                        teaching: teachingCount,
                        nonTeaching: nonTeachingCount,
                        onLeave: onLeaveCount
                    },
                    staff: onLeaveStaff.map(t => ({
                        id: t.id,
                        name: t.name || '',
                        firstName: t.name?.split(' ')[0] || '',
                        lastName: t.name?.split(' ').slice(1).join(' ') || '',
                        email: t.email,
                        profilePicture: t.profilePicture,
                        employeeId: t.teacher?.employeeId || t.nonTeachingStaff?.employeeId || '',
                        designation: t.teacher?.designation || t.nonTeachingStaff?.designation || '',
                        type: t.role.name === 'TEACHING_STAFF' ? 'teaching' : 'non-teaching',
                        status: 'on_leave',
                        leaveType: t.leaveType,
                        leaveEndDate: t.leaveEndDate
                    }))
                };
            }

            // Valid UserStatus enum values for regular status filter
            const validStatuses = ['ACTIVE', 'INACTIVE', 'LEFT', 'DISABLED', 'BANNED'];
            const statusFilter = validStatuses.includes(status) ? status : 'ACTIVE';

            const where = {
                schoolId,
                deletedAt: null,
                status: statusFilter,
                role: roleFilter,
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } }
                    ]
                })
            };

            // Get on leave count for summary
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [teachers, teachingCount, nonTeachingCount, totalActive, onLeaveCount] = await Promise.all([
                prisma.user.findMany({
                    where,
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profilePicture: true,
                        status: true,
                        role: { select: { name: true } },
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
                    where: { schoolId, deletedAt: null, status: 'ACTIVE', role: { name: 'TEACHING_STAFF' } }
                }),
                prisma.user.count({
                    where: { schoolId, deletedAt: null, status: 'ACTIVE', role: { name: 'NON_TEACHING_STAFF' } }
                }),
                prisma.user.count({
                    where: { schoolId, deletedAt: null, status: 'ACTIVE', role: { name: { in: ['TEACHING_STAFF', 'NON_TEACHING_STAFF'] } } }
                }),
                prisma.leaveRequest.groupBy({
                    by: ['userId'],
                    where: {
                        schoolId,
                        status: 'APPROVED',
                        startDate: { lte: today },
                        endDate: { gte: today },
                        user: { deletedAt: null, role: { name: { in: ['TEACHING_STAFF', 'NON_TEACHING_STAFF'] } } }
                    }
                }).then(result => result.length)
            ]);

            return {
                summary: {
                    total: totalActive,
                    teaching: teachingCount,
                    nonTeaching: nonTeachingCount,
                    onLeave: onLeaveCount
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
        }, 60); // Shorter cache for leave data

        return NextResponse.json(data);
    } catch (error) {
        console.error('[DIRECTOR TEACHERS ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch teachers', details: error.message },
            { status: 500 }
        );
    }
}
