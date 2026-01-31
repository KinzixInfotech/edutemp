// Automated Payroll Processing Cron
// POST /api/cron/payroll/auto-process
// Runs daily to check if payroll should be auto-processed

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications/notificationHelper';

// Verify cron secret for security
const verifyCronSecret = (req) => {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) return true; // Skip verification if no secret configured
    return authHeader === `Bearer ${cronSecret}`;
};

export async function POST(req) {
    // Verify request is from cron
    if (!verifyCronSecret(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    console.log(`[Cron] Payroll auto-process check: Day ${currentDay}, ${currentMonth}/${currentYear}`);

    try {
        // Get all schools with payroll config where auto period creation is enabled
        const configs = await prisma.payrollConfig.findMany({
            where: {
                enableAutoPeriodCreation: true
            },
            select: {
                schoolId: true,
                payCycleDay: true,
                enableAutoPeriodCreation: true,
                school: {
                    select: { name: true, code: true }
                }
            }
        });

        const results = {
            processed: [],
            skipped: [],
            errors: []
        };

        for (const config of configs) {
            try {
                // Check if today is the pay cycle day
                if (currentDay !== config.payCycleDay) {
                    results.skipped.push({
                        schoolId: config.schoolId,
                        reason: `Not pay cycle day (configured: ${config.payCycleDay})`
                    });
                    continue;
                }

                // Check if period already exists for this month
                const existingPeriod = await prisma.payrollPeriod.findUnique({
                    where: {
                        schoolId_month_year: {
                            schoolId: config.schoolId,
                            month: currentMonth,
                            year: currentYear
                        }
                    }
                });

                if (existingPeriod) {
                    results.skipped.push({
                        schoolId: config.schoolId,
                        reason: `Period already exists (status: ${existingPeriod.status})`
                    });
                    continue;
                }

                // Calculate period dates
                const startDate = new Date(currentYear, currentMonth - 1, 1);
                const endDate = new Date(currentYear, currentMonth, 0);

                // Get working days (simplified - can be enhanced with calendar)
                let workingDays = 0;
                let weekends = 0;
                const totalDays = endDate.getDate();

                for (let d = 1; d <= totalDays; d++) {
                    const date = new Date(currentYear, currentMonth - 1, d);
                    if (date.getDay() === 0) {
                        weekends++;
                    } else {
                        workingDays++;
                    }
                }

                // Create payroll period
                const period = await prisma.payrollPeriod.create({
                    data: {
                        schoolId: config.schoolId,
                        month: currentMonth,
                        year: currentYear,
                        startDate,
                        endDate,
                        totalWorkingDays: workingDays,
                        weekends,
                        holidays: 0,
                        status: 'DRAFT'
                    }
                });

                // Notify admin about the created period
                const monthName = startDate.toLocaleString('default', { month: 'long' });

                await sendNotification({
                    schoolId: config.schoolId,
                    title: '📅 New Payroll Period Created',
                    message: `Payroll period for ${monthName} ${currentYear} has been created. Please process payroll at your convenience.`,
                    type: 'PAYROLL',
                    priority: 'NORMAL',
                    targetOptions: {
                        roleNames: ['ADMIN', 'PRINCIPAL', 'DIRECTOR']
                    },
                    metadata: {
                        type: 'PAYROLL_PERIOD_CREATED',
                        periodId: period.id,
                        month: currentMonth,
                        year: currentYear
                    },
                    actionUrl: '/dashboard/payroll/process'
                });

                results.processed.push({
                    schoolId: config.schoolId,
                    schoolName: config.school.name,
                    periodId: period.id,
                    month: currentMonth,
                    year: currentYear
                });

            } catch (schoolError) {
                console.error(`[Cron] Error for school ${config.schoolId}:`, schoolError);
                results.errors.push({
                    schoolId: config.schoolId,
                    error: schoolError.message
                });
            }
        }

        console.log(`[Cron] Complete: ${results.processed.length} processed, ${results.skipped.length} skipped, ${results.errors.length} errors`);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            summary: {
                totalSchools: configs.length,
                processed: results.processed.length,
                skipped: results.skipped.length,
                errors: results.errors.length
            },
            results
        });

    } catch (error) {
        console.error('[Cron] Payroll auto-process error:', error);
        return NextResponse.json({
            error: 'Cron job failed',
            details: error.message
        }, { status: 500 });
    }
}

// GET - Check cron status
export async function GET(req) {
    if (!verifyCronSecret(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        status: 'active',
        description: 'Payroll auto-processing cron',
        schedule: 'Daily - Creates payroll period on configured pay cycle day'
    });
}
