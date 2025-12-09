import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

// GET - Get all students in teacher's classes with attendance percentage
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId, userId: teacherId } = params;

        const cacheKey = generateKey('teacher:students', { schoolId, teacherId });

        const result = await remember(cacheKey, async () => {
            // Get teacher's assigned classes and sections
            const teacher = await prisma.teachingStaff.findUnique({
                where: { userId: teacherId },
                include: {
                    Class: {
                        where: { schoolId },
                        include: {
                            students: {
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            name: true,
                                            profilePicture: true,
                                        }
                                    }
                                }
                            }
                        }
                    },
                    sectionsAssigned: {
                        where: { schoolId },
                        include: {
                            students: {
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            name: true,
                                            profilePicture: true,
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!teacher) {
                return { students: [] };
            }

            // Collect all students from class teacher role and assigned sections
            const studentSet = new Map();

            // From class teacher assignments
            if (teacher.Class && teacher.Class.length > 0) {
                teacher.Class.forEach(cls => {
                    cls.students.forEach(student => {
                        if (!studentSet.has(student.id)) {
                            studentSet.set(student.id, {
                                id: student.user.id,
                                studentId: student.id,
                                name: student.user.name,
                                profilePicture: student.user.profilePicture,
                                rollNumber: student.rollNumber,
                                class: {
                                    id: cls.id,
                                    className: cls.className
                                }
                            });
                        }
                    });
                });
            }

            // From assigned sections
            if (teacher.sectionsAssigned && teacher.sectionsAssigned.length > 0) {
                teacher.sectionsAssigned.forEach(section => {
                    section.students.forEach(student => {
                        if (!studentSet.has(student.id)) {
                            studentSet.set(student.id, {
                                id: student.user.id,
                                studentId: student.id,
                                name: student.user.name,
                                profilePicture: student.user.profilePicture,
                                rollNumber: student.rollNumber,
                                section: {
                                    id: section.id,
                                    name: section.name
                                }
                            });
                        }
                    });
                });
            }

            const students = Array.from(studentSet.values());

            // Get school's academic year to calculate overall attendance
            const school = await prisma.school.findUnique({
                where: { id: schoolId },
                select: {
                    AcademicYear: {
                        select: {
                            startDate: true
                        },
                        orderBy: {
                            startDate: 'desc'
                        },
                        take: 1
                    }
                }
            });

            // Determine academic year start date
            const now = new Date();
            let academicYearStart;

            if (school?.AcademicYear && school.AcademicYear.length > 0) {
                academicYearStart = new Date(school.AcademicYear[0].startDate);
            } else {
                // Default: April 1st of current academic year
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth();
                if (currentMonth >= 3) { // April (3) onwards
                    academicYearStart = new Date(currentYear, 3, 1); // April 1st this year
                } else {
                    academicYearStart = new Date(currentYear - 1, 3, 1); // April 1st last year
                }
            }

            const studentsWithAttendance = await Promise.all(
                students.map(async (student) => {
                    // Get student record to check admission/join date
                    const studentRecord = await prisma.student.findUnique({
                        where: { userId: student.id },
                        select: { admissionDate: true }
                    });

                    // Use the later of academic year start or student admission date
                    let startDate = academicYearStart;
                    if (studentRecord?.admissionDate) {
                        const admissionDate = new Date(studentRecord.admissionDate);
                        if (admissionDate > academicYearStart) {
                            startDate = admissionDate;
                        }
                    }

                    // Get ALL attendance records from start date to now
                    const attendanceRecords = await prisma.attendance.findMany({
                        where: {
                            userId: student.id,
                            schoolId,
                            date: {
                                gte: startDate,
                                lte: now
                            }
                        },
                        select: {
                            status: true
                        }
                    });

                    const totalDays = attendanceRecords.length;
                    const presentDays = attendanceRecords.filter(
                        r => r.status === 'PRESENT' || r.status === 'LATE'
                    ).length;

                    const attendancePercent = totalDays > 0
                        ? (presentDays / totalDays) * 100
                        : 0;

                    return {
                        ...student,
                        attendancePercent: Math.round(attendancePercent * 100) / 100,
                        totalDaysMarked: totalDays,
                        totalPresent: presentDays
                    };
                })
            );

            return {
                students: studentsWithAttendance.sort((a, b) =>
                    a.rollNumber && b.rollNumber ? a.rollNumber - b.rollNumber : 0
                )
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
