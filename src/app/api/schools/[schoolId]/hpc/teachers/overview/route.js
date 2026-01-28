import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { termNumber = '1' } = searchParams;

    if (!schoolId) {
        return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    try {
        // 1. Get all teachers (Using TeachingStaff)
        const teachers = await prisma.teachingStaff.findMany({
            where: { schoolId },
            select: {
                user: {
                    select: {
                        profilePicture: true
                    }
                },
                userId: true,
                name: true,
                email: true
            },
            orderBy: { name: 'asc' }
        });

        if (teachers.length === 0) {
            return NextResponse.json({ teachers: [] });
        }

        // 2. Get counts for each teacher
        const teacherStats = await Promise.all(teachers.map(async (teacher) => {
            const userId = teacher.userId;
            const term = parseInt(termNumber);

            const [assessmentsCount, activitiesCount, selCount] = await Promise.all([
                prisma.competencyAssessment.count({
                    where: { assessedById: userId, termNumber: term }
                }),
                prisma.studentActivityRecord.count({
                    where: { recordedById: userId, termNumber: term }
                }),
                prisma.sELAssessment.count({
                    where: { assessedById: userId, termNumber: term }
                })
            ]);

            return {
                id: userId,
                name: teacher.name,
                email: teacher.email,
                assessmentsCount,
                activitiesCount,
                selCount,
                profilePicture: teacher.user.profilePicture,
                totalEntries: assessmentsCount + activitiesCount + selCount
            };
        }));

        // Sort by total activity
        teacherStats.sort((a, b) => b.totalEntries - a.totalEntries);

        return NextResponse.json({ teachers: teacherStats });

    } catch (error) {
        console.error('Teacher Oversight API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
