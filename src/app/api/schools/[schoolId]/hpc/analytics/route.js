import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { classId, termNumber } = searchParams;

    if (!schoolId || !classId || !termNumber) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    try {
        // 1. Get total students in class
        const totalStudents = await prisma.student.count({
            where: { schoolId, classId }
        });

        // 2. Get reports
        const reports = await prisma.hPCReport.findMany({
            where: {
                student: { classId },
                termNumber: parseInt(termNumber),
                academicYear: { status: 'ACTIVE' } // Assuming active year
            },
            include: {
                student: { include: { user: true } }
            }
        });

        if (reports.length === 0) {
            return NextResponse.json({
                averageScore: 0,
                completedReports: 0,
                totalStudents,
                activityParticipation: 0,
                topPerformers: [],
                lowPerformers: []
            });
        }

        // 3. Calculate metrics
        const completedReports = reports.length;

        // Average Score
        const totalScore = reports.reduce((sum, r) => sum + (r.overallScore || 0), 0);
        const averageScore = completedReports > 0 ? (totalScore / completedReports).toFixed(1) : 0;

        // Activity Participation
        // Check `activities` JSON field length or query `StudentActivityRecord`
        // Simplified: Check if report has activities
        const withActivities = reports.filter(r => r.activities && Array.isArray(r.activities) && r.activities.length > 0).length;
        const activityParticipation = completedReports > 0 ? Math.round((withActivities / completedReports) * 100) : 0;

        // Top/Low Performers
        const sortedReports = [...reports].sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));

        const topPerformers = sortedReports.slice(0, 3).map(r => ({
            name: r.student.user?.name || 'Unknown',
            rollNumber: r.student.rollNumber,
            score: r.overallScore || 0
        }));

        const lowPerformers = sortedReports.filter(r => (r.overallScore || 0) < 40).slice(0, 5).map(r => ({
            name: r.student.user?.name || 'Unknown',
            score: r.overallScore || 0
        }));

        return NextResponse.json({
            averageScore,
            completedReports,
            totalStudents,
            activityParticipation,
            topPerformers,
            lowPerformers
        });

    } catch (error) {
        console.error('Analytics API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
