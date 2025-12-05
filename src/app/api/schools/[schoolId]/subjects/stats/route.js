import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/subjects/stats
export async function GET(req, props) {
  const params = await props.params;
    try {
        const { schoolId } = params;

        // Total subjects for this school
        const totalSubjects = await prisma.subject.count({
            where: {
                class: {
                    schoolId: schoolId,
                },
            },
        });

        // Subjects grouped by class
        const subjectsByClass = await prisma.subject.groupBy({
            by: ['classId'],
            where: {
                class: {
                    schoolId: schoolId,
                },
            },
            _count: {
                id: true,
            },
        });

        // Enhance with class names
        const classIds = subjectsByClass.map((s) => s.classId);
        const classes = await prisma.class.findMany({
            where: {
                id: { in: classIds },
            },
            select: {
                id: true,
                className: true,
            },
        });

        const classMap = Object.fromEntries(classes.map((c) => [c.id, c.className]));

        const classwiseStats = subjectsByClass.map((stat) => ({
            classId: stat.classId,
            className: classMap[stat.classId] || 'Unknown',
            subjectCount: stat._count.id,
        }));

        // Subjects grouped by department
        const subjectsByDepartment = await prisma.subject.groupBy({
            by: ['departmentId'],
            where: {
                class: {
                    schoolId: schoolId,
                },
            },
            _count: {
                id: true,
            },
        });

        // Enhance with department names
        const deptIds = subjectsByDepartment.map((s) => s.departmentId);
        const departments = await prisma.department.findMany({
            where: {
                id: { in: deptIds },
            },
            select: {
                id: true,
                name: true,
            },
        });

        const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

        const departmentwiseStats = subjectsByDepartment.map((stat) => ({
            departmentId: stat.departmentId,
            departmentName: deptMap[stat.departmentId] || 'Unknown',
            subjectCount: stat._count.id,
        }));

        // Subjects used in exams
        const subjectsInExams = await prisma.examSubject.groupBy({
            by: ['subjectId'],
            where: {
                exam: {
                    schoolId: schoolId,
                },
            },
            _count: {
                examId: true,
            },
        });

        return NextResponse.json({
            totalSubjects,
            classwiseStats,
            departmentwiseStats,
            examUsageCount: subjectsInExams.length,
        });
    } catch (error) {
        console.error('Error fetching subject statistics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        );
    }
}
