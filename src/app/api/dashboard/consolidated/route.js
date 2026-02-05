// ============================================
// API: /api/dashboard/consolidated/route.js
// Single consolidated dashboard endpoint
// Combines: daily-stats, fee dashboard, attendance, events, config
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

// Convert BigInt safely
const safeJSON = (obj) =>
    JSON.parse(
        JSON.stringify(obj, (_, value) =>
            typeof value === 'bigint' ? Number(value) : value
        )
    );

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('schoolId');
        const academicYearId = searchParams.get('academicYearId');

        if (!schoolId) {
            return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const todayStr = today.toISOString().split('T')[0];

        // Cache key based on all params
        const cacheKey = generateKey('dashboard-consolidated', {
            schoolId,
            academicYearId: academicYearId || 'none',
            date: todayStr
        });

        const data = await remember(cacheKey, async () => {
            // ========== PARALLEL FETCH ALL DATA ==========
            const [
                // Daily Stats
                studentAttendance,
                teachingStaffAttendance,
                nonTeachingStaffAttendance,
                totalStudents,
                totalTeachingStaff,
                totalNonTeachingStaff,
                todayPayments,
                outstandingFeesData,
                studentsWithDuesCount,

                // Attendance Summary (role-wise)
                attendanceSummary,

                // Fee Stats (if academic year provided)
                feeStats,

                // Upcoming Events
                upcomingEvents,

                // School Config
                schoolConfig,

                // Setup Status
                classes,
                feeStructures,
            ] = await Promise.all([
                // ===== DAILY STATS =====
                prisma.attendance.count({
                    where: {
                        schoolId,
                        date: { gte: today, lt: tomorrow },
                        status: 'PRESENT',
                        user: { role: { name: 'STUDENT' } }
                    }
                }),
                prisma.attendance.count({
                    where: {
                        schoolId,
                        date: { gte: today, lt: tomorrow },
                        status: 'PRESENT',
                        user: { role: { name: 'TEACHING_STAFF' } }
                    }
                }),
                prisma.attendance.count({
                    where: {
                        schoolId,
                        date: { gte: today, lt: tomorrow },
                        status: 'PRESENT',
                        user: { role: { name: 'NON_TEACHING_STAFF' } }
                    }
                }),
                prisma.student.count({ where: { schoolId } }),
                prisma.user.count({ where: { schoolId, role: { name: 'TEACHING_STAFF' } } }),
                prisma.user.count({ where: { schoolId, role: { name: 'NON_TEACHING_STAFF' } } }),

                // Today's payments
                academicYearId ? prisma.feePayment.aggregate({
                    where: {
                        schoolId,
                        academicYearId,
                        paymentDate: { gte: today, lt: tomorrow },
                        status: 'SUCCESS'
                    },
                    _sum: { amount: true },
                    _count: true
                }) : Promise.resolve({ _sum: { amount: null }, _count: 0 }),

                // Outstanding fees
                academicYearId ? prisma.studentFee.aggregate({
                    where: {
                        schoolId,
                        academicYearId,
                        balanceAmount: { gt: 0 }
                    },
                    _sum: { balanceAmount: true }
                }) : Promise.resolve({ _sum: { balanceAmount: null } }),

                // Students with dues
                academicYearId ? prisma.studentFee.count({
                    where: {
                        schoolId,
                        academicYearId,
                        balanceAmount: { gt: 0 }
                    }
                }) : Promise.resolve(0),

                // ===== ATTENDANCE SUMMARY (role-wise for widget) =====
                prisma.$queryRaw`
                    SELECT 
                        r.name as "roleName",
                        COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END)::int as "present",
                        COUNT(CASE WHEN a.status = 'ABSENT' THEN 1 END)::int as "absent",
                        COUNT(CASE WHEN a.status = 'LATE' THEN 1 END)::int as "late",
                        (SELECT COUNT(*)::int FROM "User" u2 WHERE u2."schoolId" = ${schoolId}::uuid AND u2."roleId" = r.id) as "totalUsers"
                    FROM "Role" r
                    LEFT JOIN "User" u ON u."roleId" = r.id AND u."schoolId" = ${schoolId}::uuid
                    LEFT JOIN "Attendance" a ON a."userId" = u.id AND a."date" >= ${today} AND a."date" < ${tomorrow}
                    WHERE r.name IN ('STUDENT', 'TEACHING_STAFF', 'NON_TEACHING_STAFF')
                    GROUP BY r.id, r.name
                `.catch(() => []),

                // ===== FEE STATS =====
                academicYearId ? (async () => {
                    const where = { schoolId, academicYearId };
                    const [totalExpected, totalCollected, totalDiscount, totalBalance, recentPayments, monthlyCollection] = await Promise.all([
                        prisma.studentFee.aggregate({ where, _sum: { originalAmount: true } }),
                        prisma.studentFee.aggregate({ where, _sum: { paidAmount: true } }),
                        prisma.studentFee.aggregate({ where, _sum: { discountAmount: true } }),
                        prisma.studentFee.aggregate({ where, _sum: { balanceAmount: true } }),
                        prisma.feePayment.findMany({
                            where: { schoolId, academicYearId, status: 'SUCCESS' },
                            orderBy: { paymentDate: 'desc' },
                            take: 10,
                            select: {
                                id: true,
                                amount: true,
                                paymentDate: true,
                                status: true,
                                student: {
                                    select: {
                                        name: true,
                                        admissionNo: true,
                                        class: { select: { className: true } }
                                    }
                                }
                            }
                        }),
                        prisma.$queryRaw`
                            SELECT 
                                DATE_TRUNC('month', "paymentDate") AS month,
                                SUM("amount") AS total
                            FROM "FeePayment"
                            WHERE "schoolId" = ${schoolId}::uuid
                                AND "academicYearId" = ${academicYearId}::uuid
                                AND "status" = 'SUCCESS'
                            GROUP BY month
                            ORDER BY month DESC
                            LIMIT 6
                        `.catch(() => [])
                    ]);

                    return {
                        summary: {
                            totalExpected: totalExpected._sum.originalAmount || 0,
                            totalCollected: totalCollected._sum.paidAmount || 0,
                            totalDiscount: totalDiscount._sum.discountAmount || 0,
                            totalBalance: totalBalance._sum.balanceAmount || 0,
                            collectionPercentage: totalExpected._sum.originalAmount
                                ? ((totalCollected._sum.paidAmount / totalExpected._sum.originalAmount) * 100).toFixed(2)
                                : 0,
                        },
                        recentPayments,
                        monthlyCollection
                    };
                })() : Promise.resolve(null),

                // ===== UPCOMING EVENTS =====
                prisma.calendarEvent.findMany({
                    where: {
                        schoolId,
                        startDate: { gte: today }
                    },
                    orderBy: { startDate: 'asc' },
                    take: 5,
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        startDate: true,
                        endDate: true,
                        isAllDay: true,
                        eventType: true
                    }
                }).catch(() => []),

                // ===== SCHOOL CONFIG (for timing warning) =====
                prisma.attendanceConfig.findFirst({
                    where: { schoolId },
                    select: { createdAt: true, updatedAt: true }
                }).catch(() => null),

                // ===== SETUP STATUS =====
                prisma.class.count({ where: { schoolId } }),
                prisma.globalFeeStructure.count({ where: { schoolId } }),
            ]);

            return {
                // Daily Stats (for DailyStatsCards)
                dailyStats: {
                    studentsPresent: studentAttendance,
                    totalStudents,
                    teachingStaffPresent: teachingStaffAttendance,
                    nonTeachingStaffPresent: nonTeachingStaffAttendance,
                    totalTeachingStaff,
                    totalNonTeachingStaff,
                    paymentsToday: {
                        amount: todayPayments._sum?.amount || 0,
                        count: todayPayments._count || 0
                    },
                    outstandingFees: outstandingFeesData._sum?.balanceAmount || 0,
                    studentsWithDues: studentsWithDuesCount || 0,
                    date: today.toISOString()
                },

                // Attendance Summary (for AttendanceWidget)
                attendanceSummary: {
                    roleWiseStats: attendanceSummary || [],
                    date: todayStr
                },

                // Fee Stats (for FeeStatsWidget & RecentPaymentsWidget)
                feeStats: feeStats ? safeJSON(feeStats) : null,

                // Upcoming Events (for CalendarWidget)
                upcomingEvents: upcomingEvents || [],

                // School Config (for timing warning)
                schoolConfig: schoolConfig ? {
                    isNeverModified: schoolConfig.createdAt && schoolConfig.updatedAt &&
                        new Date(schoolConfig.createdAt).getTime() === new Date(schoolConfig.updatedAt).getTime()
                } : { isNeverModified: true },

                // Setup Status (for setup warnings)
                setupStatus: {
                    hasClasses: classes > 0,
                    hasFeeStructures: feeStructures > 0,
                    classCount: classes,
                    feeStructureCount: feeStructures
                }
            };
        }, 60); // Cache for 60 seconds

        return NextResponse.json(data);
    } catch (error) {
        console.error('[CONSOLIDATED DASHBOARD ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data', details: error.message },
            { status: 500 }
        );
    }
}
