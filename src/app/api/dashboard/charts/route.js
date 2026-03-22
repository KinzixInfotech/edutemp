// ============================================
// API: /api/dashboard/charts/route.js
// Trending data for dashboard charts
// Supports range: 7d, 30d, 2m, 6m, 1y
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

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
        const range = searchParams.get('range') || '30d';

        if (!schoolId) {
            return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let startDate = new Date();
        let useMonthly = false;
        switch (range) {
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case '2m':
                startDate.setMonth(startDate.getMonth() - 2);
                break;
            case '6m':
                startDate.setMonth(startDate.getMonth() - 6);
                useMonthly = true;
                break;
            case '1y':
                startDate.setFullYear(startDate.getFullYear() - 1);
                useMonthly = true;
                break;
            default:
                startDate.setDate(startDate.getDate() - 30);
        }
        startDate.setHours(0, 0, 0, 0);

        const cacheKey = generateKey('dashboard-charts', {
            schoolId,
            academicYearId: academicYearId || 'none',
            range,
            date: today.toISOString().split('T')[0]
        });

        const data = await remember(cacheKey, async () => {
            // Prisma can't parameterize DATE_TRUNC identifiers, so we use separate queries
            const attendanceTrendQuery = useMonthly
                ? prisma.$queryRaw`
                    SELECT 
                        DATE_TRUNC('month', a."date") AS period,
                        COUNT(CASE WHEN a."status" = 'PRESENT' THEN 1 END)::int AS present,
                        COUNT(CASE WHEN a."status" = 'ABSENT' THEN 1 END)::int AS absent,
                        COUNT(CASE WHEN a."status" = 'LATE' THEN 1 END)::int AS late
                    FROM "Attendance" a
                    JOIN "User" u ON u.id = a."userId"
                    JOIN "Role" r ON r.id = u."roleId"
                    WHERE a."schoolId" = ${schoolId}::uuid
                        AND a."date" >= ${startDate}
                        AND a."date" < ${tomorrow}
                        AND r."name" = 'STUDENT'
                    GROUP BY period
                    ORDER BY period ASC
                `.catch(() => [])
                : prisma.$queryRaw`
                    SELECT 
                        DATE_TRUNC('day', a."date") AS period,
                        COUNT(CASE WHEN a."status" = 'PRESENT' THEN 1 END)::int AS present,
                        COUNT(CASE WHEN a."status" = 'ABSENT' THEN 1 END)::int AS absent,
                        COUNT(CASE WHEN a."status" = 'LATE' THEN 1 END)::int AS late
                    FROM "Attendance" a
                    JOIN "User" u ON u.id = a."userId"
                    JOIN "Role" r ON r.id = u."roleId"
                    WHERE a."schoolId" = ${schoolId}::uuid
                        AND a."date" >= ${startDate}
                        AND a."date" < ${tomorrow}
                        AND r."name" = 'STUDENT'
                    GROUP BY period
                    ORDER BY period ASC
                `.catch(() => []);

            const feeCollectionTrendQuery = !academicYearId
                ? Promise.resolve([])
                : useMonthly
                    ? prisma.$queryRaw`
                        SELECT 
                            DATE_TRUNC('month', fp."paymentDate") AS period,
                            SUM(fp."amount")::numeric AS amount,
                            COUNT(*)::int AS count
                        FROM "FeePayment" fp
                        WHERE fp."schoolId" = ${schoolId}::uuid
                            AND fp."academicYearId" = ${academicYearId}::uuid
                            AND fp."status" = 'SUCCESS'
                            AND fp."paymentDate" >= ${startDate}
                            AND fp."paymentDate" < ${tomorrow}
                        GROUP BY period
                        ORDER BY period ASC
                    `.catch(() => [])
                    : prisma.$queryRaw`
                        SELECT 
                            DATE_TRUNC('day', fp."paymentDate") AS period,
                            SUM(fp."amount")::numeric AS amount,
                            COUNT(*)::int AS count
                        FROM "FeePayment" fp
                        WHERE fp."schoolId" = ${schoolId}::uuid
                            AND fp."academicYearId" = ${academicYearId}::uuid
                            AND fp."status" = 'SUCCESS'
                            AND fp."paymentDate" >= ${startDate}
                            AND fp."paymentDate" < ${tomorrow}
                        GROUP BY period
                        ORDER BY period ASC
                    `.catch(() => []);

            const [attendanceTrend, feeCollectionTrend, attendanceToday, feeBreakdown] = await Promise.all([
                attendanceTrendQuery,
                feeCollectionTrendQuery,

                // ===== TODAY'S ATTENDANCE BREAKDOWN (for bar chart) =====
                // Filter by academic year to avoid counting students from other years
                academicYearId ? prisma.$queryRaw`
                    SELECT 
                        CASE 
                            WHEN a."status" IS NULL THEN 'ABSENT'
                            ELSE a."status"::text
                        END AS status,
                        COUNT(*)::int AS count
                    FROM "Student" s
                    JOIN "User" u ON u.id = s."userId"
                    JOIN "Class" c ON c.id = s."classId"
                    LEFT JOIN "Attendance" a ON a."userId" = u.id 
                        AND a."date" >= ${today} AND a."date" < ${tomorrow}
                    WHERE s."schoolId" = ${schoolId}::uuid
                        AND c."academicYearId" = ${academicYearId}::uuid
                    GROUP BY a."status"
                `.catch(() => []) : prisma.$queryRaw`
                    SELECT 
                        CASE 
                            WHEN a."status" IS NULL THEN 'ABSENT'
                            ELSE a."status"::text
                        END AS status,
                        COUNT(*)::int AS count
                    FROM "Student" s
                    JOIN "User" u ON u.id = s."userId"
                    LEFT JOIN "Attendance" a ON a."userId" = u.id 
                        AND a."date" >= ${today} AND a."date" < ${tomorrow}
                    WHERE s."schoolId" = ${schoolId}::uuid
                    GROUP BY a."status"
                `.catch(() => []),

                // ===== FEE BREAKDOWN (for pie chart) =====
                academicYearId ? prisma.studentFee.aggregate({
                    where: { schoolId, academicYearId },
                    _sum: {
                        originalAmount: true,
                        paidAmount: true,
                        discountAmount: true,
                        balanceAmount: true
                    }
                }).catch(() => ({ _sum: {} })) : Promise.resolve({ _sum: {} }),
            ]);

            // Format attendance breakdown for bar chart
            // Merge rows that map to the same display name (e.g. NULL + ABSENT both → 'Absent')
            const barMap = new Map(); // name → { value, fill }
            let totalStudentsForBar = 0;
            (attendanceToday || []).forEach(row => {
                totalStudentsForBar += row.count;
            });
            (attendanceToday || []).forEach(row => {
                const status = row.status || 'ABSENT';
                const name = status === 'PRESENT' ? 'Present' :
                    status === 'LATE' ? 'Late' : 'Absent';
                const fill = status === 'PRESENT' ? 'hsl(142, 71%, 45%)' :
                    status === 'LATE' ? 'hsl(38, 92%, 50%)' : 'hsl(0, 84%, 60%)';
                if (barMap.has(name)) {
                    barMap.get(name).value += row.count;
                } else {
                    barMap.set(name, { name, value: row.count, fill });
                }
            });
            const attendanceBar = Array.from(barMap.values()).map(item => ({
                ...item,
                percentage: totalStudentsForBar > 0
                    ? ((item.value / totalStudentsForBar) * 100).toFixed(1)
                    : '0',
            }));

            // Format fee breakdown for pie chart
            const feeSums = feeBreakdown._sum || {};
            const feePie = [];
            if (feeSums.paidAmount) {
                feePie.push({
                    name: 'Collected',
                    value: Number(feeSums.paidAmount) || 0,
                    fill: 'hsl(142, 71%, 45%)'
                });
            }
            if (feeSums.balanceAmount) {
                feePie.push({
                    name: 'Outstanding',
                    value: Number(feeSums.balanceAmount) || 0,
                    fill: 'hsl(0, 84%, 60%)'
                });
            }
            if (feeSums.discountAmount) {
                feePie.push({
                    name: 'Discount',
                    value: Number(feeSums.discountAmount) || 0,
                    fill: 'hsl(38, 92%, 50%)'
                });
            }
            const feeTotal = feePie.reduce((s, f) => s + f.value, 0);
            feePie.forEach(f => {
                f.percentage = feeTotal > 0 ? ((f.value / feeTotal) * 100).toFixed(1) : '0';
            });

            return {
                attendanceTrend: attendanceTrend || [],
                feeCollectionTrend: feeCollectionTrend || [],
                attendanceBar,
                feePie,
                range,
                groupBy: useMonthly ? 'month' : 'day',
            };
        }, 300);

        return NextResponse.json(safeJSON(data));
    } catch (error) {
        console.error('[DASHBOARD CHARTS ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch chart data', details: error.message },
            { status: 500 }
        );
    }
}
