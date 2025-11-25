import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, { params }) {
    try {
        const { examId } = await params;

        const exam = await prisma.exam.findUnique({
            where: { id: parseInt(examId) },
            include: {
                classes: {
                    include: {
                        students: true // To count total eligible students
                    }
                },
                attempts: {
                    where: { status: 'COMPLETED' },
                    include: { student: true }
                },
                results: {
                    include: { student: true }
                }
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

        if (exam.type === 'ONLINE') {
            stats.participated = exam.attempts.length;

            let totalScore = 0;
            const scores = [];

            exam.attempts.forEach(attempt => {
                const score = attempt.score || 0;
                totalScore += score;
                scores.push({
                    studentName: attempt.student.name,
                    className: attempt.student.classId, // Need to fetch class name
                    score: score
                });

                // Assuming 33% passing for now as default if not specified
                // We need max marks to calculate percentage.
                // Let's assume max marks is sum of question marks.
                // For now, just raw stats.
            });

            if (stats.participated > 0) {
                stats.averageScore = totalScore / stats.participated;
                stats.highestScore = Math.max(...scores.map(s => s.score));
            }

            stats.toppers = scores.sort((a, b) => b.score - a.score).slice(0, 5);

        } else {
            // Offline logic (placeholder or basic implementation)
            // Using ExamResult
            stats.participated = exam.results.length; // Unique students
            // ...
        }

        // Attendance Stats
        const attendanceRecords = await prisma.hallAttendance.findMany({
            where: { examId: parseInt(examId) }
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
