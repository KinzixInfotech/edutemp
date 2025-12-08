import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

// GET - Get class-level attendance statistics for teacher
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId, userId: teacherId } = params;
        const { searchParams } = new URL(req.url);
        const month = parseInt(searchParams.get("month")) || new Date().getMonth() + 1;
        const year = parseInt(searchParams.get("year")) || new Date().getFullYear();

        const cacheKey = generateKey('teacher:class-stats', { schoolId, teacherId, month, year });

        const result = await remember(cacheKey, async () => {
            // Get teacher's assigned classes/sections
            const teacher = await prisma.teachingStaff.findUnique({
                where: { userId: teacherId },
                include: {
                    Class: {
                        where: { schoolId },
                        select: {
                            students: {
                                select: {
                                    user: { select: { id: true } }
                                }
                            }
                        }
                    },
                    sectionsAssigned: {
                        where: { schoolId },
                        select: {
                            students: {
                                select: {
                                    user: { select: { id: true } }
                                }
                            }
                        }
                    }
                }
            });

            if (!teacher) {
                return { classStats: null };
            }

            // Collect all student IDs
            const studentIds = new Set();

            teacher.Class?.forEach(cls => {
                cls.students.forEach(student => {
                    studentIds.add(student.user.id);
                });
            });

            teacher.sectionsAssigned?.forEach(section => {
                section.students.forEach(student => {
                    studentIds.add(student.user.id);
                });
            });

            const studentIdArray = Array.from(studentIds);

            if (studentIdArray.length === 0) {
                return {
                    classStats: {
                        totalStudents: 0,
                        averageAttendance: 0,
                        totalPresent: 0,
                        totalAbsent: 0
                    }
                };
            }

            // Get attendance for all students in the month
            const attendanceRecords = await prisma.attendance.findMany({
                where: {
                    userId: { in: studentIdArray },
                    schoolId,
                    date: {
                        gte: new Date(year, month - 1, 1),
                        lt: new Date(year, month, 1)
                    }
                },
                select: {
                    userId: true,
                    status: true
                }
            });

            // Calculate stats
            const totalRecords = attendanceRecords.length;
            const presentCount = attendanceRecords.filter(
                r => r.status === 'PRESENT' || r.status === 'LATE'
            ).length;
            const absentCount = attendanceRecords.filter(
                r => r.status === 'ABSENT'
            ).length;

            const averageAttendance = totalRecords > 0
                ? (presentCount / totalRecords) * 100
                : 0;

            return {
                classStats: {
                    totalStudents: studentIdArray.length,
                    averageAttendance: Math.round(averageAttendance * 100) / 100,
                    totalPresent: presentCount,
                    totalAbsent: absentCount,
                    totalRecords
                }
            };
        }, 300); // Cache for 5 minutes

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching class attendance stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch class stats" },
            { status: 500 }
        );
    }
}
