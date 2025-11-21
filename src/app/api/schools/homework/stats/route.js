// app/api/schools/homework/stats/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
        return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    try {
        // Get active academic year
        const activeYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
            select: { id: true, name: true }
        });

        // Total homework count
        const totalHomework = await prisma.homework.count({
            where: { schoolId, isActive: true }
        });

        // Homework by status
        const now = new Date();
        const activeHomework = await prisma.homework.count({
            where: {
                schoolId,
                isActive: true,
                dueDate: { gte: now }
            }
        });

        const overdueHomework = await prisma.homework.count({
            where: {
                schoolId,
                isActive: true,
                dueDate: { lt: now }
            }
        });

        // Classes with homework
        const classesWithHomework = await prisma.homework.groupBy({
            by: ['classId'],
            where: { schoolId, isActive: true }
        });

        // Total classes
        const totalClasses = await prisma.class.count({
            where: { schoolId }
        });

        // Submission stats
        const totalSubmissions = await prisma.homeworkSubmission.count({
            where: {
                homework: { schoolId }
            }
        });

        const submittedCount = await prisma.homeworkSubmission.count({
            where: {
                homework: { schoolId },
                status: { in: ['SUBMITTED', 'EVALUATED'] }
            }
        });

        const pendingCount = await prisma.homeworkSubmission.count({
            where: {
                homework: { schoolId },
                status: 'PENDING'
            }
        });

        // Recent homework
        const recentHomework = await prisma.homework.findMany({
            where: { schoolId, isActive: true },
            take: 5,
            orderBy: { assignedDate: 'desc' },
            include: {
                class: { select: { className: true } },
                teacher: { select: { name: true } }
            }
        });

        const stats = {
            totalHomework,
            activeHomework,
            overdueHomework,
            classesWithHomework: classesWithHomework.length,
            totalClasses,
            coverage: totalClasses > 0
                ? Math.round((classesWithHomework.length / totalClasses) * 100)
                : 0,
            academicYear: activeYear?.name || 'N/A',
            submissions: {
                total: totalSubmissions,
                submitted: submittedCount,
                pending: pendingCount,
                submissionRate: totalSubmissions > 0
                    ? Math.round((submittedCount / totalSubmissions) * 100)
                    : 0
            },
            recentHomework
        };

        return NextResponse.json({ success: true, stats });
    } catch (error) {
        console.error("Homework stats error:", error);
        return NextResponse.json(
            { error: "Failed to fetch statistics" },
            { status: 500 }
        );
    }
}