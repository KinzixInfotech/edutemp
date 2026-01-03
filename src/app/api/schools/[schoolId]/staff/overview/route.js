import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

/**
 * Staff Overview API for Director/Principal
 * Staff metrics with absenteeism trends
 */
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const cacheKey = generateKey('staff:overview', { schoolId });

        const result = await remember(cacheKey, async () => {
            // 1. Get staff counts by type
            const [teachingStaff, nonTeachingStaff, admins] = await Promise.all([
                prisma.teachingStaff.count({ where: { schoolId } }),
                prisma.nonTeachingStaff.count({ where: { schoolId } }),
                prisma.admin.count({ where: { schoolId } }),
            ]);

            const totalStaff = teachingStaff + nonTeachingStaff + admins;

            // 2. Today's attendance
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Get staff user IDs
            const staffUsers = await prisma.user.findMany({
                where: {
                    schoolId,
                    role: {
                        name: {
                            in: ['TEACHING_STAFF', 'NON_TEACHING_STAFF', 'ADMIN'],
                        },
                    },
                },
                select: { id: true },
            });

            const staffUserIds = staffUsers.map(u => u.id);

            const todayAttendance = await prisma.attendance.count({
                where: {
                    schoolId,
                    userId: { in: staffUserIds },
                    date: { gte: today, lt: tomorrow },
                    status: 'PRESENT',
                },
            });

            const todayAbsent = await prisma.attendance.count({
                where: {
                    schoolId,
                    userId: { in: staffUserIds },
                    date: { gte: today, lt: tomorrow },
                    status: 'ABSENT',
                },
            });

            // 3. Weekly absenteeism trend (last 7 days)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            const weeklyAbsences = await prisma.attendance.groupBy({
                by: ['date'],
                where: {
                    schoolId,
                    userId: { in: staffUserIds },
                    date: { gte: weekAgo },
                    status: 'ABSENT',
                },
                _count: true,
            });

            const weeklyTrend = weeklyAbsences.map(item => ({
                date: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
                count: item._count,
            }));

            // 4. Pending leave requests
            const pendingLeaves = await prisma.leaveRequest.count({
                where: {
                    schoolId,
                    status: 'PENDING',
                    userId: { in: staffUserIds },
                },
            });

            // 5. Payroll status
            let payrollStatus = { pending: 0, paid: 0 };
            try {
                const currentMonth = new Date().getMonth() + 1;
                const currentYear = new Date().getFullYear();

                const payrollPeriod = await prisma.payrollPeriod.findFirst({
                    where: {
                        schoolId,
                        month: currentMonth,
                        year: currentYear,
                    },
                });

                if (payrollPeriod) {
                    const [pending, paid] = await Promise.all([
                        prisma.payrollItem.count({
                            where: {
                                periodId: payrollPeriod.id,
                                paymentStatus: 'PENDING',
                            },
                        }),
                        prisma.payrollItem.count({
                            where: {
                                periodId: payrollPeriod.id,
                                paymentStatus: 'PAID',
                            },
                        }),
                    ]);
                    payrollStatus = { pending, paid };
                }
            } catch (e) {
                console.log('Payroll data not available');
            }

            return {
                summary: {
                    total: totalStaff,
                    teaching: teachingStaff,
                    nonTeaching: nonTeachingStaff,
                    admin: admins,
                },
                attendance: {
                    present: todayAttendance,
                    absent: todayAbsent,
                    rate: totalStaff > 0 ? ((todayAttendance / totalStaff) * 100).toFixed(1) : 0,
                },
                absenteeismTrend: weeklyTrend,
                pendingLeaves,
                payroll: payrollStatus,
            };
        }, 120);

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching staff overview:", error);
        return NextResponse.json(
            { error: "Failed to fetch staff overview", details: error.message },
            { status: 500 }
        );
    }
}
