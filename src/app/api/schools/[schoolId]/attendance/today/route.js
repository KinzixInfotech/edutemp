import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        if (!schoolId || schoolId === 'null') {
            return NextResponse.json(
                { error: 'Invalid schoolId', attendance: [], summary: { total: 0, present: 0, absent: 0, late: 0, percentage: 0 } },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const type = searchParams.get('type') || 'student'; // student, teacher, staff
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

        // Get today's date range
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Determine which roles to filter by based on type
        // Correct role names from database: STUDENT, TEACHING_STAFF, NON_TEACHING_STAFF
        let roleFilter = [];

        if (type === 'student') {
            roleFilter = ['STUDENT'];
        } else if (type === 'teacher') {
            roleFilter = ['TEACHING_STAFF'];
        } else if (type === 'staff') {
            roleFilter = ['NON_TEACHING_STAFF', 'ACCOUNTANT', 'LIBRARIAN', 'DRIVER', 'CONDUCTOR'];
        }

        // Build where clause with role filter
        const where = {
            schoolId,
            date: {
                gte: startOfDay,
                lte: endOfDay
            },
            ...(status && { status: status.toUpperCase() }),
            user: {
                role: {
                    name: { in: roleFilter }
                }
            }
        };

        // Fetch attendance records based on type
        let attendanceRecords = [];
        let totalCount = 0;

        if (type === 'student') {
            // Student attendance
            [attendanceRecords, totalCount] = await Promise.all([
                prisma.attendance.findMany({
                    where,
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                profilePicture: true,
                                student: {
                                    select: {
                                        name: true,
                                        class: { select: { className: true } },
                                        section: { select: { name: true } }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { markedAt: 'desc' },
                    take: 200
                }),
                prisma.student.count({
                    where: {
                        schoolId,
                        user: { deletedAt: null, status: 'ACTIVE' }
                    }
                })
            ]);
        } else if (type === 'teacher') {
            // Teacher attendance - role is TEACHING_STAFF
            [attendanceRecords, totalCount] = await Promise.all([
                prisma.attendance.findMany({
                    where,
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                profilePicture: true,
                                teacher: {
                                    select: {
                                        name: true,
                                        designation: true,
                                        department: { select: { name: true } }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { markedAt: 'desc' },
                    take: 200
                }),
                prisma.user.count({
                    where: {
                        schoolId,
                        deletedAt: null,
                        status: 'ACTIVE',
                        role: { name: 'TEACHING_STAFF' }
                    }
                })
            ]);
        } else if (type === 'staff') {
            // Non-teaching staff - role is NON_TEACHING_STAFF
            [attendanceRecords, totalCount] = await Promise.all([
                prisma.attendance.findMany({
                    where,
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                profilePicture: true,
                                role: { select: { name: true } },
                                nonTeachingStaff: {
                                    select: {
                                        name: true,
                                        designation: true,
                                        department: { select: { name: true } }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { markedAt: 'desc' },
                    take: 200
                }),
                prisma.user.count({
                    where: {
                        schoolId,
                        deletedAt: null,
                        status: 'ACTIVE',
                        role: { name: { in: ['NON_TEACHING_STAFF', 'ACCOUNTANT', 'LIBRARIAN', 'DRIVER', 'CONDUCTOR'] } }
                    }
                })
            ]);
        }

        // Calculate summary
        const present = attendanceRecords.filter(a => a.status === 'PRESENT').length;
        const absent = attendanceRecords.filter(a => a.status === 'ABSENT').length;
        const late = attendanceRecords.filter(a => a.status === 'LATE').length;
        const percentage = totalCount > 0 ? Math.round((present / totalCount) * 100) : 0;

        // Format attendance records based on type
        const formattedAttendance = attendanceRecords.map(a => {
            if (type === 'student') {
                return {
                    id: a.id,
                    userId: a.userId,
                    name: a.user?.student?.name || a.user?.name || 'Unknown',
                    profilePicture: a.user?.profilePicture,
                    class: a.user?.student?.class?.className || 'N/A',
                    section: a.user?.student?.section?.name || 'N/A',
                    status: a.status,
                    markedAt: a.markedAt,
                    remarks: a.remarks
                };
            } else if (type === 'teacher') {
                return {
                    id: a.id,
                    userId: a.userId,
                    name: a.user?.teacher?.name || a.user?.name || 'Unknown',
                    profilePicture: a.user?.profilePicture,
                    subject: a.user?.teacher?.designation || 'Teacher',
                    department: a.user?.teacher?.department?.name || 'N/A',
                    status: a.status,
                    markedAt: a.markedAt,
                    remarks: a.remarks
                };
            } else {
                // Staff
                return {
                    id: a.id,
                    userId: a.userId,
                    name: a.user?.nonTeachingStaff?.name || a.user?.name || 'Unknown',
                    profilePicture: a.user?.profilePicture,
                    designation: a.user?.nonTeachingStaff?.designation || a.user?.role?.name?.replace(/_/g, ' ') || 'Staff',
                    department: a.user?.nonTeachingStaff?.department?.name || 'N/A',
                    status: a.status,
                    markedAt: a.markedAt,
                    remarks: a.remarks
                };
            }
        });

        return NextResponse.json({
            type,
            summary: {
                total: totalCount,
                present,
                absent,
                late,
                percentage
            },
            attendance: formattedAttendance
        });
    } catch (error) {
        console.error('[ATTENDANCE TODAY ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch attendance', details: error.message },
            { status: 500 }
        );
    }
}
