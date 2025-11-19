// app/api/schools/[schoolId]/attendance/delegations/teachers-on-leave/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const ISTDate = (input) => {
    if (!input) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now;
    }
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        const [year, month, day] = input.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

    }
    const d = new Date(input);
    d.setHours(0, 0, 0, 0);
    return d;
};

// Calculate days between two dates
const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both days
    return diffDays;
};

// GET - Fetch teachers on leave for a specific date (default: today)
export async function GET(req, { params }) {
    const { schoolId } = await params;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || null;
    const checkDate = ISTDate(date);
    console.log(checkDate);

    try {
        // 1. Find all approved leave requests for the given date
        const leaveRequests = await prisma.leaveRequest.findMany({
            where: {
                schoolId,
                status: 'APPROVED',
                startDate: { lte: checkDate },
                endDate: { gte: checkDate },
                // user: {
                //     roleId: 2 // Teachers only (adjust based on your role ID)
                // }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        teacher: {
                            select: {
                                userId: true,
                                employeeId: true,
                                name: true,
                                designation: true,
                                // Class Teacher
                                Class: {
                                    where: { schoolId },
                                    select: {
                                        id: true,
                                        className: true,
                                        _count: {
                                            select: { students: true }
                                        }
                                    }
                                },
                                // Section Teacher
                                sectionsAssigned: {
                                    where: { schoolId },
                                    select: {
                                        id: true,
                                        name: true,
                                        classId: true,
                                        class: {
                                            select: {
                                                id: true,
                                                className: true
                                            }
                                        },
                                        _count: {
                                            select: { students: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        console.log(leaveRequests, 'requestes leave');

        // 2. Check existing delegations for these teachers
        const teacherIds = leaveRequests.map(lr => lr.userId);
        const existingDelegations = await prisma.attendanceDelegation.findMany({
            where: {
                schoolId,
                originalTeacherId: { in: teacherIds },
                status: 'ACTIVE',
                startDate: { lte: checkDate },
                endDate: { gte: checkDate }
            },
            include: {
                substituteTeacher: {
                    select: {
                        userId: true,
                        name: true,
                        employeeId: true
                    }
                }
            }
        });

        // Create a map for quick lookup
        const delegationMap = new Map();
        existingDelegations.forEach(del => {
            const key = `${del.originalTeacherId}-${del.classId}-${del.sectionId || 'null'}`;
            delegationMap.set(key, del);
        });

        // 3. Process each leave request and build class list
        const classesAffected = [];
        const teachersOnLeaveSet = new Set();

        leaveRequests.forEach(leave => {
            const teacher = leave.user.teacher;
            if (!teacher) return;

            teachersOnLeaveSet.add(leave.userId);
            const leaveDays = calculateDays(leave.startDate, leave.endDate);

            // Add class teacher assignments
            teacher.Class.forEach(cls => {
                const delegationKey = `${teacher.userId}-${cls.id}-null`;
                const delegation = delegationMap.get(delegationKey);

                classesAffected.push({
                    classId: cls.id,
                    className: cls.className,
                    sectionId: null,
                    sectionName: null,
                    studentCount: cls._count.students,
                    teacherId: teacher.userId,
                    teacherName: teacher.name,
                    employeeId: teacher.employeeId,
                    designation: teacher.designation,
                    leaveType: leave.leaveType,
                    leaveStartDate: leave.startDate,
                    leaveEndDate: leave.endDate,
                    leaveDays: leaveDays,
                    leaveReason: leave.reason,
                    hasDelegation: !!delegation,
                    delegationId: delegation?.id || null,
                    substituteTeacherId: delegation?.substituteTeacher?.userId || null,
                    substituteTeacherName: delegation?.substituteTeacher?.name || null,
                    substituteTeacherEmployeeId: delegation?.substituteTeacher?.employeeId || null
                });
            });

            // Add section teacher assignments
            teacher.sectionsAssigned.forEach(section => {
                const delegationKey = `${teacher.userId}-${section.classId}-${section.id}`;
                const delegation = delegationMap.get(delegationKey);

                classesAffected.push({
                    classId: section.classId,
                    className: section.class.className,
                    sectionId: section.id,
                    sectionName: section.name,
                    studentCount: section._count.students,
                    teacherId: teacher.userId,
                    teacherName: teacher.name,
                    employeeId: teacher.employeeId,
                    designation: teacher.designation,
                    leaveType: leave.leaveType,
                    leaveStartDate: leave.startDate,
                    leaveEndDate: leave.endDate,
                    leaveDays: leaveDays,
                    leaveReason: leave.reason,
                    hasDelegation: !!delegation,
                    delegationId: delegation?.id || null,
                    substituteTeacherId: delegation?.substituteTeacher?.userId || null,
                    substituteTeacherName: delegation?.substituteTeacher?.name || null,
                    substituteTeacherEmployeeId: delegation?.substituteTeacher?.employeeId || null
                });
            });
        });

        // 4. Calculate stats
        const pendingAssignments = classesAffected.filter(c => !c.hasDelegation).length;
        const uniqueClasses = new Set(classesAffected.map(c => `${c.classId}-${c.sectionId}`)).size;

        return NextResponse.json({
            success: true,
            date: checkDate.toISOString().split('T')[0],
            count: teachersOnLeaveSet.size,
            classesAffected: uniqueClasses,
            pending: pendingAssignments,
            classes: classesAffected.sort((a, b) => {
                // Sort by hasDelegation (false first), then by className
                if (a.hasDelegation !== b.hasDelegation) {
                    return a.hasDelegation ? 1 : -1;
                }
                return a.className.localeCompare(b.className);
            }),
            summary: {
                totalTeachersOnLeave: teachersOnLeaveSet.size,
                totalClassesAffected: uniqueClasses,
                assignedDelegations: classesAffected.filter(c => c.hasDelegation).length,
                pendingAssignments: pendingAssignments
            }
        });
    } catch (error) {
        console.error('Fetch teachers on leave error:', error);
        return NextResponse.json({
            error: 'Failed to fetch teachers on leave',
            details: error.message
        }, { status: 500 });
    }
}