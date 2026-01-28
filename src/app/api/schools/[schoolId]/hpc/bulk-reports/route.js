import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getHPCReportData } from '@/lib/hpc/reportGenerator';

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { classId, termNumber } = searchParams;

    if (!schoolId || !classId || !termNumber) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    try {
        // 1. Get all students in the class
        const students = await prisma.student.findMany({
            where: { schoolId, classId },
            include: { user: { select: { name: true } } },
            orderBy: { name: 'asc' }
        });

        if (students.length === 0) {
            return NextResponse.json({ success: true, reports: [] });
        }

        // 2. Generate data for each student
        // Using Promise.all to fetch in parallel (caution with DB load)
        const reports = await Promise.all(students.map(async (student) => {
            try {
                const reportData = await getHPCReportData(schoolId, student.userId, parseInt(termNumber));
                return reportData;
            } catch (err) {
                console.error(`Failed to generate HPC for student ${student.userId}:`, err);
                return {
                    student: {
                        id: student.userId,
                        name: student.user?.name || student.name,
                        rollNumber: student.rollNumber,
                        class: student.className
                    },
                    error: 'Failed to generate report'
                };
            }
        }));

        return NextResponse.json({
            success: true,
            reports
        });

    } catch (error) {
        console.error('Bulk HPC Report Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
