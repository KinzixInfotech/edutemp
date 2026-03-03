import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

// GET - Get class statistics
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;

        const cacheKey = generateKey('classes:stats', { schoolId });

        const stats = await remember(cacheKey, async () => {
            // Get total classes
            const totalClasses = await prisma.class.count({
                where: { schoolId }
            });

            // Get total sections
            const totalSections = await prisma.section.count({
                where: { schoolId }
            });

            // Get total students
            const totalStudents = await prisma.student.count({
                where: { schoolId, isAlumni: false }
            });

            // Sections without class teacher
            const sectionsWithoutTeacher = await prisma.section.count({
                where: { schoolId, teachingStaffUserId: null }
            });

            // Empty sections (0 students)
            const sectionsWithStudents = await prisma.section.findMany({
                where: { schoolId },
                select: {
                    id: true,
                    _count: { select: { students: true } }
                }
            });
            const emptySections = sectionsWithStudents.filter(s => s._count.students === 0).length;

            // Total distinct teachers assigned to sections
            const teachersAssigned = await prisma.section.findMany({
                where: {
                    schoolId,
                    teachingStaffUserId: { not: null }
                },
                select: { teachingStaffUserId: true },
                distinct: ['teachingStaffUserId']
            });
            const totalTeachersAssigned = teachersAssigned.length;

            // Get students per class breakdown
            const classesWithCounts = await prisma.class.findMany({
                where: { schoolId },
                include: {
                    sections: {
                        include: {
                            _count: {
                                select: {
                                    students: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    className: 'asc'
                }
            });

            // Calculate breakdown
            const breakdown = classesWithCounts.map(cls => {
                const studentCount = cls.sections.reduce((sum, sec) => sum + sec._count.students, 0);
                return {
                    className: cls.className,
                    sectionCount: cls.sections.length,
                    studentCount
                };
            });

            const avgStudentsPerClass = totalClasses > 0
                ? Math.round(totalStudents / totalClasses)
                : 0;

            return {
                totalClasses,
                totalSections,
                totalStudents,
                avgStudentsPerClass,
                sectionsWithoutTeacher,
                emptySections,
                totalTeachersAssigned,
                breakdown
            };
        }, 300); // Cache for 5 minutes

        return NextResponse.json(stats);
    } catch (error) {
        console.error("Error fetching class stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch class statistics" },
            { status: 500 }
        );
    }
}
