import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(req.url);
        const academicYearId = searchParams.get('academicYearId');

        // Build where clause
        const examWhere = {
            schoolId,
            ...(academicYearId && { academicYearId })
        };

        // Get total exams
        const totalExams = await prisma.exam.count({ where: examWhere });

        // Get upcoming exams
        const upcomingExams = await prisma.exam.findMany({
            where: {
                ...examWhere,
                startDate: { gte: new Date() },
                status: { not: 'COMPLETED' }
            },
            include: {
                classes: { select: { id: true, className: true } },
                _count: { select: { classes: true } }
            },
            orderBy: { startDate: 'asc' },
            take: 10
        });

        // Get recent exams
        const recentExams = await prisma.exam.findMany({
            where: {
                ...examWhere,
                status: 'COMPLETED'
            },
            include: {
                _count: { select: { classes: true } }
            },
            orderBy: { endDate: 'desc' },
            take: 10
        });

        // Get exam type breakdown
        const examsByType = await prisma.exam.groupBy({
            by: ['type'],
            where: examWhere,
            _count: true
        });

        const examTypeBreakdown = examsByType.reduce((acc, item) => {
            acc[item.type] = item._count;
            return acc;
        }, {});

        // Get exam by status for draft count
        const draftExams = await prisma.exam.count({
            where: { ...examWhere, status: 'DRAFT' }
        });
        examTypeBreakdown.DRAFT = draftExams;

        // Get student participation stats
        const attempts = await prisma.studentExamAttempt.findMany({
            where: {
                exam: examWhere
            },
            select: {
                score: true,
                status: true,
                student: {
                    select: {
                        name: true,
                        classId: true,
                        class: { select: { className: true } }
                    }
                },
                exam: {
                    select: {
                        id: true,
                        title: true,
                        endDate: true,
                        questions: {
                            select: {
                                marks: true
                            }
                        }
                    }
                }
            }
        });

        const totalStudentsParticipated = attempts.length;

        // Calculate pass/fail rates (assuming pass is 40% or more)
        const passThreshold = 0.4;
        let passed = 0;
        let failed = 0;

        // Calculate max score for each attempt and determine pass/fail
        const attemptsWithMaxScore = attempts.map(attempt => {
            const maxScore = attempt.exam.questions.reduce((sum, q) => sum + q.marks, 0);
            return { ...attempt, maxScore };
        });

        attemptsWithMaxScore.forEach(attempt => {
            if (attempt.maxScore && attempt.score !== null) {
                const percentage = attempt.score / attempt.maxScore;
                if (percentage >= passThreshold) {
                    passed++;
                } else {
                    failed++;
                }
            }
        });

        const overallPassRate = totalStudentsParticipated > 0
            ? Math.round((passed / totalStudentsParticipated) * 100)
            : 0;
        const overallFailRate = totalStudentsParticipated > 0
            ? Math.round((failed / totalStudentsParticipated) * 100)
            : 0;

        // Get top performers (top 10)
        const topPerformers = attemptsWithMaxScore
            .filter(a => a.score !== null && a.maxScore)
            .sort((a, b) => (b.score / b.maxScore) - (a.score / a.maxScore))
            .slice(0, 10)
            .map(a => ({
                studentName: a.student.name,
                className: a.student.class?.className || 'N/A',
                examTitle: a.exam.title,
                examDate: a.exam.endDate,
                score: a.score,
                maxScore: a.maxScore
            }));

        // Get class-wise performance
        const classGroups = {};
        attemptsWithMaxScore.forEach(attempt => {
            const classId = attempt.student.classId;
            if (!classId) return;

            if (!classGroups[classId]) {
                classGroups[classId] = {
                    classId,
                    className: attempt.student.class?.className || 'Unknown',
                    totalStudents: 0,
                    participated: 0,
                    passed: 0,
                    failed: 0,
                    totalScore: 0,
                    count: 0
                };
            }

            classGroups[classId].participated++;
            if (attempt.maxScore && attempt.score !== null) {
                const percentage = attempt.score / attempt.maxScore;
                if (percentage >= passThreshold) {
                    classGroups[classId].passed++;
                } else {
                    classGroups[classId].failed++;
                }
                classGroups[classId].totalScore += attempt.score;
                classGroups[classId].count++;
            }
        });

        // Get total students per class
        const classStudentCounts = await prisma.student.groupBy({
            by: ['classId'],
            _count: true
        });

        classStudentCounts.forEach(cls => {
            if (classGroups[cls.classId]) {
                classGroups[cls.classId].totalStudents = cls._count;
            }
        });

        const classWisePerformance = Object.values(classGroups).map(cls => ({
            ...cls,
            avgScore: cls.count > 0 ? cls.totalScore / cls.count : null
        }));

        return NextResponse.json({
            totalExams,
            upcomingExams,
            recentExams,
            totalStudentsParticipated,
            overallPassRate,
            overallFailRate,
            topPerformers,
            classWisePerformance,
            examTypeBreakdown
        });

    } catch (error) {
        console.error('Examination Overview Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch examination overview' },
            { status: 500 }
        );
    }
}
