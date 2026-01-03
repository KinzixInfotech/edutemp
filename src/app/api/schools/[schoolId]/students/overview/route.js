import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

/**
 * Student Overview API for Admin/Principal
 * Enrollment trends, admissions, dropouts, fee defaulters
 */
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);
        const academicYearId = searchParams.get("academicYearId");

        const cacheKey = generateKey('student:overview', { schoolId, academicYearId });

        const result = await remember(cacheKey, async () => {
            // Get current academic year if not provided
            let yearId = academicYearId;
            if (!yearId) {
                const activeYear = await prisma.academicYear.findFirst({
                    where: { schoolId, isActive: true },
                    select: { id: true, startDate: true },
                });
                yearId = activeYear?.id;
            }

            // 1. Total Students
            const totalStudents = await prisma.student.count({
                where: { schoolId },
            });

            // 2. New admissions this academic year
            const yearStart = await prisma.academicYear.findUnique({
                where: { id: yearId },
                select: { startDate: true },
            });

            const newAdmissions = await prisma.student.count({
                where: {
                    schoolId,
                    admissionDate: yearStart?.startDate ? { gte: yearStart.startDate } : undefined,
                },
            });

            // 3. This month's new admissions
            const monthStart = new Date();
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);

            const thisMonthAdmissions = await prisma.student.count({
                where: {
                    schoolId,
                    admissionDate: { gte: monthStart },
                },
            });

            // 4. Class-wise distribution
            const classDistribution = await prisma.student.groupBy({
                by: ['classId'],
                where: { schoolId },
                _count: true,
            });

            // Get class names
            const classIds = classDistribution.map(c => c.classId).filter(Boolean);
            const classes = await prisma.class.findMany({
                where: { id: { in: classIds } },
                select: { id: true, className: true },
            });
            const classMap = Object.fromEntries(classes.map(c => [c.id, c.className]));

            const byClass = classDistribution.map(c => ({
                className: classMap[c.classId] || 'Unknown',
                count: c._count,
            })).sort((a, b) => a.className.localeCompare(b.className));

            // 5. Today's attendance
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const studentUserIds = await prisma.student.findMany({
                where: { schoolId },
                select: { userId: true },
            });
            const userIds = studentUserIds.map(s => s.userId).filter(Boolean);

            const [presentToday, absentToday] = await Promise.all([
                prisma.attendance.count({
                    where: {
                        schoolId,
                        userId: { in: userIds },
                        date: { gte: today, lt: tomorrow },
                        status: 'PRESENT',
                    },
                }),
                prisma.attendance.count({
                    where: {
                        schoolId,
                        userId: { in: userIds },
                        date: { gte: today, lt: tomorrow },
                        status: 'ABSENT',
                    },
                }),
            ]);

            // 6. Fee Defaulters
            const feeDefaulters = await prisma.studentFee.findMany({
                where: {
                    schoolId,
                    academicYearId: yearId,
                    balance: { gt: 0 },
                    status: { in: ['UNPAID', 'PARTIAL'] },
                },
                select: {
                    balance: true,
                    student: {
                        select: {
                            id: true,
                            name: true,
                            admissionNo: true,
                            class: { select: { className: true } },
                            section: { select: { name: true } },
                        },
                    },
                },
                orderBy: { balance: 'desc' },
                take: 10,
            });

            const totalDefaulters = await prisma.studentFee.count({
                where: {
                    schoolId,
                    academicYearId: yearId,
                    balance: { gt: 0 },
                    status: { in: ['UNPAID', 'PARTIAL'] },
                },
            });

            const totalOutstanding = await prisma.studentFee.aggregate({
                where: {
                    schoolId,
                    academicYearId: yearId,
                    balance: { gt: 0 },
                },
                _sum: { balance: true },
            });

            return {
                summary: {
                    total: totalStudents,
                    newThisYear: newAdmissions,
                    newThisMonth: thisMonthAdmissions,
                },
                attendance: {
                    present: presentToday,
                    absent: absentToday,
                    rate: totalStudents > 0 ? ((presentToday / totalStudents) * 100).toFixed(1) : 0,
                },
                byClass,
                feeDefaulters: {
                    count: totalDefaulters,
                    totalOutstanding: totalOutstanding._sum.balance || 0,
                    topDefaulters: feeDefaulters.map(d => ({
                        id: d.student?.id,
                        name: d.student?.name,
                        admissionNo: d.student?.admissionNo,
                        class: d.student?.class?.className,
                        section: d.student?.section?.name,
                        balance: d.balance,
                    })),
                },
            };
        }, 120);

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching student overview:", error);
        return NextResponse.json(
            { error: "Failed to fetch student overview", details: error.message },
            { status: 500 }
        );
    }
}
