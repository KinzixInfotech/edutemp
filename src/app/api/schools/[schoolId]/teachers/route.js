// app/api/schools/[schoolId]/teachers/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const ISTDate = (input) => {
    if (!input) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    }
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return new Date(`${input}T00:00:00.000Z`);
    }
    const d = new Date(input);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
};

// GET - Fetch teachers
export async function GET(req, { params }) {
    const { schoolId } = await params;
    const { searchParams } = new URL(req.url);

    const available = searchParams.get('available') === 'true';
    const date = searchParams.get('date') || null;
    const checkDate = ISTDate(date);

    try {
        if (available) {
            // Fetch teachers who are:
            // 1. NOT on leave today
            // 2. NOT already assigned as substitute today
            // 3. Are active

            // Get teachers on leave
            const teachersOnLeave = await prisma.leaveRequest.findMany({
                where: {
                    schoolId,
                    status: 'APPROVED',
                    startDate: { lte: checkDate },
                    endDate: { gte: checkDate },
                },
                select: { userId: true }
            });

            const onLeaveIds = teachersOnLeave.map(l => l.userId);

            // Get teachers already assigned as substitutes
            const assignedSubstitutes = await prisma.attendanceDelegation.findMany({
                where: {
                    schoolId,
                    status: 'ACTIVE',
                    startDate: { lte: checkDate },
                    endDate: { gte: checkDate }
                },
                select: { substituteTeacherId: true }
            });

            const substituteIds = assignedSubstitutes.map(d => d.substituteTeacherId);

            // Combine both lists
            const unavailableIds = [...new Set([...onLeaveIds, ...substituteIds])];

            // Fetch available teachers
            const teachers = await prisma.teachingStaff.findMany({
                where: {
                    schoolId,
                    userId: {
                        notIn: unavailableIds
                    },
                    user: {
                        status: 'ACTIVE'
                    }
                },
                select: {
                    userId: true,
                    name: true,
                    employeeId: true,
                    designation: true,
                    departmentId: true,
                    department: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    user: {
                        select: {
                            email: true,
                            profilePicture: true
                        }
                    },
                    Class: {
                        where: { schoolId },
                        select: {
                            id: true,
                            className: true
                        }
                    },
                    sectionsAssigned: {
                        where: { schoolId },
                        select: {
                            id: true,
                            name: true,
                            classId: true,
                            class: {
                                select: {
                                    className: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    name: 'asc'
                }
            });

            return NextResponse.json({
                success: true,
                count: teachers.length,
                date: checkDate.toISOString().split('T')[0],
                teachers: teachers.map(t => ({
                    userId: t.userId,
                    name: t.name,
                    employeeId: t.employeeId,
                    designation: t.designation,
                    email: t.user.email,
                    profilePicture: t.user.profilePicture,
                    department: t.department?.name || null,
                    ownClasses: t.Class.map(c => c.className).join(', '),
                    ownSections: t.sectionsAssigned.map(s => `${s.class.className}-${s.name}`).join(', '),
                    availability: 'AVAILABLE'
                }))
            });
        } else {
            // Fetch all teachers (original behavior)
            const teachers = await prisma.teachingStaff.findMany({
                where: {
                    schoolId,
                    user: {
                        status: 'ACTIVE'
                    }
                },
                select: {
                    userId: true,
                    name: true,
                    employeeId: true,
                    designation: true,
                    gender: true,
                    contactNumber: true,
                    email: true,
                    departmentId: true,
                    department: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    user: {
                        select: {
                            email: true,
                            profilePicture: true,
                            status: true
                        }
                    },
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
                    sectionsAssigned: {
                        where: { schoolId },
                        select: {
                            id: true,
                            name: true,
                            classId: true,
                            class: {
                                select: {
                                    className: true
                                }
                            },
                            _count: {
                                select: { students: true }
                            }
                        }
                    }
                },
                orderBy: {
                    name: 'asc'
                }
            });

            return NextResponse.json({
                success: true,
                count: teachers.length,
                teachers: teachers.map(t => ({
                    userId: t.userId,
                    name: t.name,
                    employeeId: t.employeeId,
                    designation: t.designation,
                    gender: t.gender,
                    contactNumber: t.contactNumber,
                    email: t.email,
                    profilePicture: t.user.profilePicture,
                    status: t.user.status,
                    department: t.department?.name || null,
                    classTeacher: t.Class.map(c => ({
                        id: c.id,
                        name: c.className,
                        studentCount: c._count.students
                    })),
                    sectionTeacher: t.sectionsAssigned.map(s => ({
                        id: s.id,
                        name: `${s.class.className}-${s.name}`,
                        className: s.class.className,
                        sectionName: s.name,
                        studentCount: s._count.students
                    }))
                }))
            });
        }
    } catch (error) {
        console.error('Fetch teachers error:', error);
        return NextResponse.json({
            error: 'Failed to fetch teachers',
            details: error.message
        }, { status: 500 });
    }
}