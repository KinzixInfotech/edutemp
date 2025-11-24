import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/timetable/stats
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        // Total entries
        const totalEntries = await prisma.timetableEntry.count({
            where: { schoolId, isActive: true },
        });

        // Total unique classes with timetables
        const classesWithEntries = await prisma.timetableEntry.groupBy({
            by: ['classId'],
            where: { schoolId, isActive: true },
        });

        // Total unique teachers assigned
        const teachersWithEntries = await prisma.timetableEntry.groupBy({
            by: ['teacherId'],
            where: { schoolId, isActive: true },
        });

        // Teacher workload (count of periods per teacher)
        const teacherWorkload = await prisma.timetableEntry.groupBy({
            by: ['teacherId'],
            where: { schoolId, isActive: true },
            _count: { id: true },
        });

        // Fetch teacher names
        const teacherIds = teacherWorkload.map((t) => t.teacherId);
        const teachers = await prisma.teachingStaff.findMany({
            where: { userId: { in: teacherIds } },
            select: { userId: true, name: true },
        });

        const teacherMap = Object.fromEntries(teachers.map((t) => [t.userId, t.name]));

        const teacherwiseStats = teacherWorkload.map((t) => ({
            teacherId: t.teacherId,
            teacherName: teacherMap[t.teacherId] || 'Unknown',
            periodCount: t._count.id,
        })).sort((a, b) => b.periodCount - a.periodCount);

        // Subject distribution
        const subjectDistribution = await prisma.timetableEntry.groupBy({
            by: ['subjectId'],
            where: { schoolId, isActive: true },
            _count: { id: true },
        });

        // Fetch subject names
        const subjectIds = subjectDistribution.map((s) => s.subjectId);
        const subjects = await prisma.subject.findMany({
            where: { id: { in: subjectIds } },
            select: { id: true, subjectName: true },
        });

        const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s.subjectName]));

        const subjectwiseStats = subjectDistribution.map((s) => ({
            subjectId: s.subjectId,
            subjectName: subjectMap[s.subjectId] || 'Unknown',
            periodCount: s._count.id,
        })).sort((a, b) => b.periodCount - a.periodCount);

        // Class-wise period count
        const classwisePeriods = await prisma.timetableEntry.groupBy({
            by: ['classId'],
            where: { schoolId, isActive: true },
            _count: { id: true },
        });

        // Fetch class names
        const classIds = classwisePeriods.map((c) => c.classId);
        const classes = await prisma.class.findMany({
            where: { id: { in: classIds } },
            select: { id: true, className: true },
        });

        const classMap = Object.fromEntries(classes.map((c) => [c.id, c.className]));

        const classwiseStats = classwisePeriods.map((c) => ({
            classId: c.classId,
            className: classMap[c.classId] || 'Unknown',
            periodCount: c._count.id,
        })).sort((a, b) => b.periodCount - a.periodCount);

        return NextResponse.json({
            totalPeriods: totalEntries,
            totalClasses: classesWithEntries.length,
            totalTeachers: teachersWithEntries.length,
            utilizationRate: 0, // Can be calculated based on total slots vs filled slots
            teacherwiseStats,
            subjectwiseStats,
            classwiseStats,
        });
    } catch (error) {
        console.error('Error fetching timetable statistics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        );
    }
}
