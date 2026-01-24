import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey } from "@/lib/cache";

const CACHE_TTL = 300; // 5 minutes

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return errorResponse('User ID is required', 400);
    }

    try {
        const cacheKey = generateKey('leaves-balance', { schoolId, userId });

        const result = await remember(cacheKey, async () => {
            // Find current academic year for the school
            const academicYear = await prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
                select: { id: true }
            });

            if (!academicYear) {
                // Return defaults when no academic year
                return {
                    totalUsed: 0,
                    breakdown: getDefaultBreakdown()
                };
            }

            // Fetch leave buckets to get the configured limits
            const leaveBuckets = await prisma.leaveBucket.findMany({
                where: { schoolId, academicYearId: academicYear.id },
                select: { leaveType: true, yearlyLimit: true }
            });

            // Create a map of leave type to yearly limit
            const bucketLimits = {};
            leaveBuckets.forEach(bucket => {
                bucketLimits[bucket.leaveType] = bucket.yearlyLimit;
            });

            // Fetch leave balance for the user in the current academic year
            const leaveBalance = await prisma.leaveBalance.findUnique({
                where: {
                    userId_academicYearId: {
                        userId,
                        academicYearId: academicYear.id
                    }
                }
            });

            // Build breakdown with defaults
            const breakdown = {
                casualLeaveUsed: leaveBalance?.casualLeaveUsed || 0,
                casualLeaveTotal: bucketLimits['CASUAL'] ?? 12,
                casualLeaveBalance: (bucketLimits['CASUAL'] ?? 12) - (leaveBalance?.casualLeaveUsed || 0),

                sickLeaveUsed: leaveBalance?.sickLeaveUsed || 0,
                sickLeaveTotal: bucketLimits['SICK'] ?? 10,
                sickLeaveBalance: (bucketLimits['SICK'] ?? 10) - (leaveBalance?.sickLeaveUsed || 0),

                earnedLeaveUsed: leaveBalance?.earnedLeaveUsed || 0,
                earnedLeaveTotal: bucketLimits['EARNED'] ?? 15,
                earnedLeaveBalance: (bucketLimits['EARNED'] ?? 15) - (leaveBalance?.earnedLeaveUsed || 0),

                maternityLeaveUsed: leaveBalance?.maternityLeaveUsed || 0,
                maternityLeaveTotal: bucketLimits['MATERNITY'] ?? 0,
                maternityLeaveBalance: (bucketLimits['MATERNITY'] ?? 0) - (leaveBalance?.maternityLeaveUsed || 0),
            };

            // Calculate total used leaves
            const totalUsed =
                breakdown.casualLeaveUsed +
                breakdown.sickLeaveUsed +
                breakdown.earnedLeaveUsed +
                breakdown.maternityLeaveUsed;

            return {
                totalUsed,
                breakdown
            };
        }, CACHE_TTL);

        return apiResponse(result);

    } catch (error) {
        console.error('Leave balance error:', error);
        return apiResponse({
            totalUsed: 0,
            breakdown: getDefaultBreakdown()
        });
    }
}

function getDefaultBreakdown() {
    return {
        casualLeaveUsed: 0,
        casualLeaveTotal: 12,
        casualLeaveBalance: 12,
        sickLeaveUsed: 0,
        sickLeaveTotal: 10,
        sickLeaveBalance: 10,
        earnedLeaveUsed: 0,
        earnedLeaveTotal: 15,
        earnedLeaveBalance: 15,
        maternityLeaveUsed: 0,
        maternityLeaveTotal: 0,
        maternityLeaveBalance: 0,
    };
}
