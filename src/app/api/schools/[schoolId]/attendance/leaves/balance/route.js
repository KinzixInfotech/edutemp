import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { apiResponse, errorResponse } from "@/lib/api-utils";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return errorResponse('User ID is required', 400);
    }

    try {
        // Find active academic year for the school
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
            select: { id: true } // Optimization
        });

        if (!academicYear) {
            // If no academic year, return 0s instead of 404 to avoid breaking UI
            return apiResponse({
                totalUsed: 0,
                breakdown: {}
            });
        }

        // Fetch leave balance for the user in the current academic year
        const leaveBalance = await prisma.leaveBalance.findUnique({
            where: {
                userId_academicYearId: {
                    userId,
                    academicYearId: academicYear.id
                }
            }
        });

        if (!leaveBalance) {
            return apiResponse({
                totalUsed: 0,
                breakdown: {}
            });
        }

        // Calculate total used leaves across all types
        const totalUsed =
            (leaveBalance.casualLeaveUsed || 0) +
            (leaveBalance.sickLeaveUsed || 0) +
            (leaveBalance.earnedLeaveUsed || 0) +
            (leaveBalance.maternityLeaveUsed || 0);

        return apiResponse({
            totalUsed,
            breakdown: leaveBalance
        });

    } catch (error) {
        console.error('Leave balance error:', error);
        // Fallback to avoid crashing dashboard
        return apiResponse({
            totalUsed: 0,
            error: 'Failed to fetch'
        });
    }
}
