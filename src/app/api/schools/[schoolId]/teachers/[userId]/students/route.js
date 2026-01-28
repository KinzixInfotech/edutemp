import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

// GET - Get all students in teacher's classes with attendance percentage
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId, userId: teacherId } = params;

        const cacheKey = generateKey('teacher:students:v2', { schoolId, teacherId });

        const result = await remember(cacheKey, async () => {
            // 1. Get teacher's assigned classes and sections IDs
            const teacher = await prisma.teachingStaff.findUnique({
                where: { userId: teacherId },
                include: {
                    Class: {
                        where: { schoolId },
                        select: { id: true, className: true }
                    },
                    sectionsAssigned: {
                        where: { schoolId },
                        select: { id: true, name: true, class: { select: { className: true } } }
                    }
                }
            });

            if (!teacher) {
                return { students: [] };
            }

            const classIds = teacher.Class.map(c => c.id);
            const sectionIds = teacher.sectionsAssigned.map(s => s.id);

            if (classIds.length === 0 && sectionIds.length === 0) {
                return { students: [] };
            }

            // 2. Query Student model directly
            const rawStudents = await prisma.student.findMany({
                where: {
                    schoolId,
                    OR: [
                        { sectionId: { in: sectionIds } },
                        { classId: { in: classIds } }
                    ],
                    // Removed isAlumni, using user status instead to match bulk attendance logic
                    user: {
                        status: 'ACTIVE',
                        deletedAt: null
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            profilePicture: true,
                        }
                    },
                    section: {
                        select: {
                            id: true,
                            name: true,
                            class: {
                                select: { className: true }
                            }
                        }
                    },
                    class: {
                        select: {
                            id: true,
                            className: true
                        }
                    }
                }
            });

            // Map to standard format
            const students = rawStudents.map(student => {
                const className = student.section?.class?.className || student.class?.className || '';
                const sectionName = student.section?.name || '';
                const sectionId = student.sectionId;

                return {
                    id: student.user.id,
                    studentId: student.id,
                    name: student.user.name,
                    email: student.user.email,
                    profilePicture: student.user.profilePicture,
                    rollNumber: student.rollNumber,
                    admissionNo: student.admissionNo,
                    sectionId: sectionId,
                    sectionName: sectionName,
                    className: className
                };
            });

            // Get academic year start
            const school = await prisma.school.findUnique({
                where: { id: schoolId },
                select: {
                    AcademicYear: {
                        select: { startDate: true },
                        orderBy: { startDate: 'desc' },
                        take: 1
                    }
                }
            });

            const now = new Date();
            let academicYearStart;

            if (school?.AcademicYear && school.AcademicYear.length > 0) {
                academicYearStart = new Date(school.AcademicYear[0].startDate);
            } else {
                const currentYear = now.getFullYear();
                academicYearStart = new Date(currentYear - (now.getMonth() < 3 ? 1 : 0), 3, 1);
            }

            // Calculate attendance
            const studentsWithAttendance = await Promise.all(
                students.map(async (student) => {
                    let startDate = academicYearStart;
                    const studentRecord = rawStudents.find(s => s.id === student.studentId);

                    if (studentRecord?.admissionDate) {
                        const admissionDate = new Date(studentRecord.admissionDate);
                        if (admissionDate > academicYearStart) {
                            startDate = admissionDate;
                        }
                    }

                    const attendanceRecords = await prisma.attendance.findMany({
                        where: {
                            userId: student.id,
                            schoolId,
                            date: { gte: startDate, lte: now }
                        },
                        select: { status: true }
                    });

                    const totalDays = attendanceRecords.length;
                    const presentDays = attendanceRecords.filter(r => ['PRESENT', 'LATE'].includes(r.status)).length;
                    const attendancePercent = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

                    return {
                        ...student,
                        attendancePercent: Math.round(attendancePercent * 100) / 100,
                        totalDaysMarked: totalDays,
                        totalPresent: presentDays
                    };
                })
            );

            return {
                students: studentsWithAttendance.sort((a, b) => {
                    const rollA = parseInt(a.rollNumber) || 9999;
                    const rollB = parseInt(b.rollNumber) || 9999;
                    return rollA - rollB;
                })
            };
        }, 300); // Cache for 5 minutes

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching teacher's students:", error);
        return NextResponse.json(
            { error: "Failed to fetch students" },
            { status: 500 }
        );
    }
}
