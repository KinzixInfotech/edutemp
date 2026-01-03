import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

/**
 * Smart Alerts API for Director/Principal
 * Auto-generated alerts based on rules
 */
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const cacheKey = generateKey('alerts:smart', { schoolId });

        const result = await remember(cacheKey, async () => {
            const alerts = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 1. Pending Approvals > 48 hours
            const fortyEightHoursAgo = new Date();
            fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

            const overdueLeaves = await prisma.leaveRequest.count({
                where: {
                    schoolId,
                    status: 'PENDING',
                    submittedAt: { lt: fortyEightHoursAgo },
                },
            });

            if (overdueLeaves > 0) {
                alerts.push({
                    id: 'overdue-leaves',
                    type: 'approval',
                    severity: 'high',
                    title: 'Overdue Leave Requests',
                    message: `${overdueLeaves} leave request(s) pending for more than 48 hours`,
                    count: overdueLeaves,
                    actionUrl: '/(screens)/principal/approvals',
                    icon: '⏰',
                });
            }

            // 2. Low Attendance Alert (< 80%)
            const studentUsers = await prisma.student.findMany({
                where: { schoolId },
                select: { userId: true },
            });
            const studentUserIds = studentUsers.map(s => s.userId).filter(Boolean);

            const totalStudents = studentUserIds.length;
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const presentToday = await prisma.attendance.count({
                where: {
                    schoolId,
                    userId: { in: studentUserIds },
                    date: { gte: today, lt: tomorrow },
                    status: 'PRESENT',
                },
            });

            const attendanceRate = totalStudents > 0 ? (presentToday / totalStudents) * 100 : 100;

            if (attendanceRate < 80) {
                alerts.push({
                    id: 'low-attendance',
                    type: 'attendance',
                    severity: attendanceRate < 60 ? 'critical' : 'high',
                    title: 'Low Student Attendance',
                    message: `Only ${attendanceRate.toFixed(1)}% attendance today (${presentToday}/${totalStudents})`,
                    count: totalStudents - presentToday,
                    actionUrl: '/attendance/view',
                    icon: '📉',
                });
            }

            // 3. High Staff Absenteeism
            const staffUsers = await prisma.user.findMany({
                where: {
                    schoolId,
                    role: { name: { in: ['TEACHING_STAFF', 'NON_TEACHING_STAFF'] } },
                },
                select: { id: true },
            });
            const staffUserIds = staffUsers.map(u => u.id);

            const staffAbsent = await prisma.attendance.count({
                where: {
                    schoolId,
                    userId: { in: staffUserIds },
                    date: { gte: today, lt: tomorrow },
                    status: 'ABSENT',
                },
            });

            const staffAbsenteeRate = staffUserIds.length > 0 ? (staffAbsent / staffUserIds.length) * 100 : 0;

            if (staffAbsenteeRate > 15) {
                alerts.push({
                    id: 'staff-absenteeism',
                    type: 'attendance',
                    severity: staffAbsenteeRate > 25 ? 'critical' : 'high',
                    title: 'High Staff Absenteeism',
                    message: `${staffAbsent} staff members absent today (${staffAbsenteeRate.toFixed(1)}%)`,
                    count: staffAbsent,
                    actionUrl: '/(screens)/director/teachers',
                    icon: '👨‍🏫',
                });
            }

            // 4. Fee Collection Below Target (< 70% of expected)
            const activeYear = await prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
                select: { id: true },
            });

            if (activeYear) {
                const feeStats = await prisma.studentFee.aggregate({
                    where: {
                        schoolId,
                        academicYearId: activeYear.id,
                    },
                    _sum: { totalAmount: true, paidAmount: true },
                });

                const expected = feeStats._sum.totalAmount || 0;
                const collected = feeStats._sum.paidAmount || 0;
                const collectionRate = expected > 0 ? (collected / expected) * 100 : 100;

                if (collectionRate < 70) {
                    alerts.push({
                        id: 'low-fee-collection',
                        type: 'finance',
                        severity: collectionRate < 50 ? 'critical' : 'warning',
                        title: 'Fee Collection Below Target',
                        message: `Only ${collectionRate.toFixed(1)}% of expected fees collected`,
                        count: Math.round(expected - collected),
                        actionUrl: '/(screens)/director/fees-pending',
                        icon: '💰',
                    });
                }
            }

            // 5. Pending Payroll Approval
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const pendingPayroll = await prisma.payrollPeriod.count({
                where: {
                    schoolId,
                    status: 'PENDING_APPROVAL',
                },
            });

            if (pendingPayroll > 0) {
                alerts.push({
                    id: 'pending-payroll',
                    type: 'approval',
                    severity: 'high',
                    title: 'Payroll Pending Approval',
                    message: `${pendingPayroll} payroll period(s) awaiting approval`,
                    count: pendingPayroll,
                    actionUrl: '/(screens)/principal/approvals',
                    icon: '💵',
                });
            }

            // 6. Expiring Notices
            const weekFromNow = new Date();
            weekFromNow.setDate(weekFromNow.getDate() + 7);

            const expiringNotices = await prisma.notice.count({
                where: {
                    schoolId,
                    status: 'PUBLISHED',
                    expiryDate: {
                        gte: today,
                        lte: weekFromNow,
                    },
                },
            });

            if (expiringNotices > 0) {
                alerts.push({
                    id: 'expiring-notices',
                    type: 'info',
                    severity: 'low',
                    title: 'Notices Expiring Soon',
                    message: `${expiringNotices} notice(s) will expire in the next 7 days`,
                    count: expiringNotices,
                    actionUrl: '/noticeboard',
                    icon: '📌',
                });
            }

            // Sort by severity
            const severityOrder = { critical: 0, high: 1, warning: 2, low: 3, info: 4 };
            alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

            return {
                alerts,
                summary: {
                    total: alerts.length,
                    critical: alerts.filter(a => a.severity === 'critical').length,
                    high: alerts.filter(a => a.severity === 'high').length,
                    warning: alerts.filter(a => a.severity === 'warning').length,
                },
            };
        }, 60); // Cache for 1 minute

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching alerts:", error);
        return NextResponse.json(
            { error: "Failed to fetch alerts", details: error.message },
            { status: 500 }
        );
    }
}
