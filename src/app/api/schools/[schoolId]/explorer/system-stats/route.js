// API to fetch school stats from existing system
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;

        // Get total students
        const totalStudents = await prisma.student.count({
            where: { schoolId }
        });

        // Get total teaching staff
        const totalTeachingStaff = await prisma.teachingStaff.count({
            where: { schoolId }
        });

        // Get total non-teaching staff
        const totalNonTeachingStaff = await prisma.nonTeachingStaff.count({
            where: { schoolId }
        });

        // Calculate ratio
        const studentTeacherRatio = totalTeachingStaff > 0
            ? Math.round(totalStudents / totalTeachingStaff)
            : 0;

        return NextResponse.json({
            totalStudents,
            totalTeachers: totalTeachingStaff,
            totalNonTeachingStaff,
            studentTeacherRatio
        });

    } catch (error) {
        console.error('[SYSTEM STATS API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch system stats' },
            { status: 500 }
        );
    }
}
