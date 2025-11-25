import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, { params }) {
    try {
        const { examId } = await params;

        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            include: {
                classes: {
                    include: {
                        students: true // To count total eligible students
                    }
                },
                // For Online Exams
                attempts: {
                    where: { isFinished: true },
                    include: { student: true }
                },
                questions: true, // To calculate max marks for online

                // For Offline Exams
                results: {
                    include: { student: true }
                },
                subjects: true // To calculate max marks for offline
            }
        });

        if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

        // Calculate total eligible students
        const totalEligibleStudents = exam.classes.reduce((acc, cls) => acc + cls.students.length, 0);

        let stats = {
            totalEligible: totalEligibleStudents,
            participated: 0,
            passed: 0,
            failed: 0,
            averageScore: 0,
            highestScore: 0,
            toppers: [],
            classWise: {}
        };

        const passThreshold = 0.33; // 33% passing
        let totalPercentageSum = 0;
        const performances = [];

        if (exam.type === 'ONLINE') {
            stats.participated = exam.attempts.length;
            const maxScore = exam.questions.reduce((sum, q) => sum + q.marks, 0);

            exam.attempts.forEach(attempt => {
                const score = attempt.score || 0;
                const percentage = maxScore > 0 ? score / maxScore : 0;

                if (percentage >= passThreshold) stats.passed++; else stats.failed++;

                totalPercentageSum += percentage * 100;

                performances.push({
                    studentName: attempt.student.name,
                    className: attempt.student.classId, // We might want class name but schema only has ID here easily
                    score: score,
                    maxScore: maxScore,
                    percentage: percentage * 100
                });
            });

        } else {
            // OFFLINE EXAMS
            // Group results by student
            const studentResults = {};

            // Map subject max marks
            const subjectMaxMarks = {};
            exam.subjects.forEach(sub => {
                subjectMaxMarks[sub.subjectId] = sub.maxMarks || 100;
            });

            exam.results.forEach(res => {
                if (!studentResults[res.studentId]) {
                    studentResults[res.studentId] = {
                        student: res.student,
                        totalObtained: 0,
                        totalMax: 0
                    };
                }

                if (res.marksObtained !== null) {
                    studentResults[res.studentId].totalObtained += res.marksObtained;
                    studentResults[res.studentId].totalMax += (subjectMaxMarks[res.subjectId] || 100);
                }
            });

            const participants = Object.values(studentResults);
            stats.participated = participants.length;

            participants.forEach(p => {
                const percentage = p.totalMax > 0 ? p.totalObtained / p.totalMax : 0;

                if (percentage >= passThreshold) stats.passed++; else stats.failed++;

                totalPercentageSum += percentage * 100;

                performances.push({
                    studentName: p.student.name,
                    className: p.student.classId,
                    score: p.totalObtained,
                    maxScore: p.totalMax,
                    percentage: percentage * 100
                });
            });
        }

        if (stats.participated > 0) {
            stats.averageScore = Math.round(totalPercentageSum / stats.participated); // Average Percentage
            stats.highestScore = Math.max(...performances.map(p => p.percentage)); // Highest Percentage
        }

        stats.toppers = performances
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 5);

        // Attendance Stats
        const attendanceRecords = await prisma.hallAttendance.findMany({
            where: { examId: examId }
        });

        stats.attendance = {
            present: attendanceRecords.filter(a => a.status === 'PRESENT').length,
            absent: attendanceRecords.filter(a => a.status === 'ABSENT').length,
            totalMarked: attendanceRecords.length
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching exam stats:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
