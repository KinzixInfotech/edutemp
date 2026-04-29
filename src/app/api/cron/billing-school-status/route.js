import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { applyAutomatedSchoolStatus } from '@/lib/school-account-service';
import { FREEZE_TYPE, SCHOOL_STATUS } from '@/lib/school-account-state';

function isAuthorized(request) {
    const bearer = request.headers.get('authorization');
    const expectedBearer = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
    const internalKey = request.headers.get('x-internal-key');
    const expectedInternal = process.env.INTERNAL_API_KEY || 'edubreezy_internal';
    const vercelCron = request.headers.get('x-vercel-cron');
    return bearer === expectedBearer || internalKey === expectedInternal || !!vercelCron;
}

export async function GET(request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const pastDueAfterDays = Number(process.env.SCHOOL_PAST_DUE_AFTER_DAYS || 3);
        const suspendAfterDays = Number(process.env.SCHOOL_SUSPEND_AFTER_DAYS || 14);
        const now = new Date();

        const subscriptions = await prisma.schoolSubscription.findMany({
            where: {
                school: {
                    status: {
                        not: SCHOOL_STATUS.TERMINATED,
                    },
                },
            },
            select: {
                id: true,
                schoolId: true,
                billingEndDate: true,
                status: true,
                school: {
                    select: {
                        name: true,
                        status: true,
                    },
                },
            },
        });

        const results = [];

        for (const subscription of subscriptions) {
            const overdueMs = now.getTime() - new Date(subscription.billingEndDate).getTime();
            const overdueDays = Math.max(0, Math.floor(overdueMs / (1000 * 60 * 60 * 24)));

            let nextSchoolStatus = SCHOOL_STATUS.ACTIVE;
            let nextSubscriptionStatus = 'ACTIVE';
            let freezeType = null;
            let reason = null;

            if (overdueDays > suspendAfterDays) {
                nextSchoolStatus = SCHOOL_STATUS.SUSPENDED;
                nextSubscriptionStatus = 'SUSPENDED';
                freezeType = FREEZE_TYPE.HARD;
                reason = `Billing overdue by ${overdueDays} days`;
            } else if (overdueDays > pastDueAfterDays) {
                nextSchoolStatus = SCHOOL_STATUS.PAST_DUE;
                nextSubscriptionStatus = 'EXPIRED';
                freezeType = FREEZE_TYPE.SOFT;
                reason = `Billing overdue by ${overdueDays} days`;
            }

            await applyAutomatedSchoolStatus({
                schoolId: subscription.schoolId,
                status: nextSchoolStatus,
                freezeType,
                reason,
            });

            if (subscription.status !== nextSubscriptionStatus) {
                await prisma.schoolSubscription.update({
                    where: { id: subscription.id },
                    data: { status: nextSubscriptionStatus },
                });
            }

            results.push({
                schoolId: subscription.schoolId,
                schoolName: subscription.school.name,
                overdueDays,
                schoolStatus: nextSchoolStatus,
                subscriptionStatus: nextSubscriptionStatus,
            });
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            pastDueAfterDays,
            suspendAfterDays,
            results,
        });
    } catch (error) {
        console.error('[BILLING_SCHOOL_STATUS_CRON]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process billing state updates' },
            { status: 500 },
        );
    }
}

export const POST = GET;
