import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SubscriptionAction } from "@prisma/client";

// GET - Check if school can add more students
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(req.url);
        const additionalStudents = parseInt(searchParams.get('count') || '1', 10);

        const subscription = await prisma.schoolSubscription.findUnique({
            where: { schoolId },
            select: {
                id: true,
                softCapacity: true,
                includedCapacity: true,
                unitsPurchased: true,
                status: true,
            },
        });

        if (!subscription) {
            return NextResponse.json(
                { error: "Subscription not found" },
                { status: 404 }
            );
        }

        // Check subscription status
        if (subscription.status === 'EXPIRED' || subscription.status === 'SUSPENDED' || subscription.status === 'CANCELLED') {
            return NextResponse.json({
                canAdd: false,
                reason: `Subscription is ${subscription.status.toLowerCase()}. Please contact EduBreezy to reactivate.`,
                currentCount: 0,
                softCapacity: subscription.softCapacity,
                remaining: 0,
            });
        }

        // Get current student count
        const currentCount = await prisma.student.count({
            where: { schoolId },
        });

        const remaining = subscription.softCapacity - currentCount;
        const canAdd = remaining >= additionalStudents;
        const utilizationPercent = Math.round((currentCount / subscription.softCapacity) * 100);

        // Warning threshold (90%)
        const isNearLimit = utilizationPercent >= 90;
        const isAtLimit = remaining <= 0;

        let message = null;
        if (isAtLimit) {
            message = "You have reached your student capacity limit. Please contact EduBreezy to upgrade your plan.";
        } else if (isNearLimit) {
            message = `Warning: You are at ${utilizationPercent}% capacity. Only ${remaining} student slots remaining.`;
        }

        return NextResponse.json({
            canAdd,
            currentCount,
            includedCapacity: subscription.includedCapacity,
            softCapacity: subscription.softCapacity,
            remaining,
            utilizationPercent,
            isNearLimit,
            isAtLimit,
            message,
            additionalStudentsRequested: additionalStudents,
        });
    } catch (error) {
        console.error("Error checking capacity:", error);
        return NextResponse.json(
            { error: "Failed to check capacity" },
            { status: 500 }
        );
    }
}

// POST - Log capacity exceeded event (called when school tries to exceed limit)
export async function POST(req, { params }) {
    try {
        const { schoolId } = await params;
        const body = await req.json();
        const { performedBy, attemptedCount } = body;

        const subscription = await prisma.schoolSubscription.findUnique({
            where: { schoolId },
        });

        if (!subscription) {
            return NextResponse.json(
                { error: "Subscription not found" },
                { status: 404 }
            );
        }

        // Get current student count
        const currentCount = await prisma.student.count({
            where: { schoolId },
        });

        // Log capacity exceeded event
        await prisma.subscriptionAuditLog.create({
            data: {
                subscriptionId: subscription.id,
                action: SubscriptionAction.CAPACITY_EXCEEDED,
                performedBy: performedBy,
                previousValue: {
                    currentStudents: currentCount,
                    softCapacity: subscription.softCapacity,
                },
                newValue: {
                    attemptedToAdd: attemptedCount || 1,
                    wouldExceedBy: (currentCount + (attemptedCount || 1)) - subscription.softCapacity,
                },
                reason: "School attempted to add students beyond capacity limit",
            },
        });

        return NextResponse.json({
            success: true,
            logged: true,
            message: "Capacity exceeded event logged. Super Admin will be notified.",
        });
    } catch (error) {
        console.error("Error logging capacity exceeded:", error);
        return NextResponse.json(
            { error: "Failed to log capacity exceeded event" },
            { status: 500 }
        );
    }
}
