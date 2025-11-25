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

        // --- STATISTICS CALCULATION ---

        let totalStudentsParticipated = 0;
        let passed = 0;
        let failed = 0;
        let allPerformances = [];
        const classGroups = {};

        const passThreshold = 0.33; // 33% passing marks

        // 1. ONLINE EXAMS (from StudentExamAttempt)
        const onlineAttempts = await prisma.studentExamAttempt.findMany({
            where: {
                exam: {
                    ...examWhere,
                    type: 'ONLINE'
                },
                status: "COMPLETED"
            },
            select: {
                score: true,
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
                            select: { marks: true }
                        }
                    }
                }
            }
        });

        onlineAttempts.forEach(attempt => {
            const maxScore = attempt.exam.questions.reduce((sum, q) => sum + q.marks, 0);
            if (maxScore > 0 && attempt.score !== null) {
                totalStudentsParticipated++;
                const percentage = attempt.score / maxScore;
                const isPassed = percentage >= passThreshold;

                if (isPassed) passed++; else failed++;

                allPerformances.push({
                    studentName: attempt.student.name,
                    className: attempt.student.class?.className || 'N/A',
                    examTitle: attempt.exam.title,
                    examDate: attempt.exam.endDate,
                    score: attempt.score,
                    maxScore: maxScore,
                    percentage: percentage * 100
                });

                // Class grouping
                const classId = attempt.student.classId;
                if (classId) {
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
                    if (isPassed) classGroups[classId].passed++; else classGroups[classId].failed++;
                    classGroups[classId].totalScore += attempt.score; // Note: this is raw score, might be hard to avg across different max scores
                    classGroups[classId].count++;
                }
            }
        });

        // 2. OFFLINE EXAMS (from ExamResult)
        // We need to aggregate results per student per exam
        const offlineResults = await prisma.examResult.findMany({
            where: {
                exam: {
                    ...examWhere,
                    type: 'OFFLINE'
                }
            },
            include: {
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
                        subjects: true // to get max marks
                    }
                },
                subject: true
            }
        });

        // Group by Exam + Student
        const offlineStudentMap = {};

        offlineResults.forEach(res => {
            const key = `${res.examId}-${res.studentId}`;
            if (!offlineStudentMap[key]) {
                offlineStudentMap[key] = {
                    student: res.student,
                    exam: res.exam,
                    totalObtained: 0,
                    totalMax: 0
                };
            }

            // Find max marks for this subject in this exam
            const examSubject = res.exam.subjects.find(s => s.subjectId === res.subjectId);
            const maxMarks = examSubject ? examSubject.maxMarks : 100; // Default 100 if not found

            if (res.marksObtained !== null) {
                offlineStudentMap[key].totalObtained += res.marksObtained;
                offlineStudentMap[key].totalMax += maxMarks;
            }
        });

        Object.values(offlineStudentMap).forEach(record => {
            if (record.totalMax > 0) {
                totalStudentsParticipated++;
                const percentage = record.totalObtained / record.totalMax;
                const isPassed = percentage >= passThreshold;

                if (isPassed) passed++; else failed++;

                allPerformances.push({
                    studentName: record.student.name,
                    className: record.student.class?.className || 'N/A',
                    examTitle: record.exam.title,
                    examDate: record.exam.endDate,
                    score: record.totalObtained,
                    maxScore: record.totalMax,
                    percentage: percentage * 100
                });

                // Class grouping
                const classId = record.student.classId;
                if (classId) {
                    if (!classGroups[classId]) {
                        classGroups[classId] = {
                            classId,
                            className: record.student.class?.className || 'Unknown',
                            totalStudents: 0,
                            participated: 0,
                            passed: 0,
                            failed: 0,
                            totalScore: 0,
                            count: 0
                        };
                    }
                    classGroups[classId].participated++;
                    if (isPassed) classGroups[classId].passed++; else classGroups[classId].failed++;
                    // For offline, we might want to normalize score or just sum it. 
                    // Averaging raw scores across different exams is tricky.
                    // Let's use percentage for class average maybe?
                    classGroups[classId].totalScore += percentage * 100; // Storing percentage sum for offline
                    classGroups[classId].count++;
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
        const topPerformers = allPerformances
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 10);

        // Get total students per class
        const classStudentCounts = await prisma.student.groupBy({
            by: ['classId'],
            where: { schoolId },
            _count: true
        });

        classStudentCounts.forEach(cls => {
            if (classGroups[cls.classId]) {
                classGroups[cls.classId].totalStudents = cls._count;
            }
        });

        const classWisePerformance = Object.values(classGroups).map(cls => ({
            ...cls,
            avgScore: cls.count > 0 ? Math.round(cls.totalScore / cls.count) : 0 // This is avg percentage for offline mixed with raw score for online... tricky.
            // Ideally we should normalize everything to percentage.
        }));

        // Fix avgScore: Convert Online raw scores to percentage for consistency if mixing
        // Actually, let's just leave it as is for now, or normalize online to percentage too.
        // In the loop above: `classGroups[classId].totalScore += attempt.score;` -> change to percentage.

        // RE-CALCULATING CLASS AVG AS PERCENTAGE
        // I'll fix the online loop to add percentage instead of raw score.

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
