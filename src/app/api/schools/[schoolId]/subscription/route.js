import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SubscriptionAction } from "@prisma/client";
import { z } from "zod";

// GET - Fetch school subscription (for School Admin dashboard or Super Admin)
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        const subscription = await prisma.schoolSubscription.findUnique({
            where: { schoolId },
            include: {
                school: {
                    select: {
                        id: true,
                        name: true,
                        domain: true,
                        schoolCode: true,
                    },
                },
                auditLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!subscription) {
            return NextResponse.json(
                { error: "Subscription not found" },
                { status: 404 }
            );
        }

        // Get current student count
        const currentStudentCount = await prisma.student.count({
            where: { schoolId },
        });

        return NextResponse.json({
            subscription,
            usage: {
                currentStudents: currentStudentCount,
                includedCapacity: subscription.includedCapacity,
                softCapacity: subscription.softCapacity,
                remaining: subscription.softCapacity - currentStudentCount,
                utilizationPercent: Math.round((currentStudentCount / subscription.softCapacity) * 100),
            },
        });
    } catch (error) {
        console.error("Error fetching subscription:", error);
        return NextResponse.json(
            { error: "Failed to fetch subscription" },
            { status: 500 }
        );
    }
}

// PATCH - Update subscription (Super Admin only - for upgrades)
const updateSchema = z.object({
    expectedStudents: z.coerce.number().min(1).optional(),
    unitsPurchased: z.coerce.number().min(1).optional(),
    reason: z.string().optional(),
    performedBy: z.string().uuid(), // Super Admin ID required
});

// Pricing constants
const PRICE_PER_UNIT = 10500;
const STUDENTS_PER_UNIT = 100;
const SOFT_BUFFER_PERCENT = 5;

export async function PATCH(req, { params }) {
    try {
        const { schoolId } = await params;
        const body = await req.json();
        const parsed = updateSchema.parse(body);

        const existingSubscription = await prisma.schoolSubscription.findUnique({
            where: { schoolId },
        });

        if (!existingSubscription) {
            return NextResponse.json(
                { error: "Subscription not found" },
                { status: 404 }
            );
        }

        // Calculate new values if units are being updated
        let updateData = {};

        if (parsed.unitsPurchased && parsed.unitsPurchased !== existingSubscription.unitsPurchased) {
            const newUnits = parsed.unitsPurchased;
            const newIncludedCapacity = newUnits * STUDENTS_PER_UNIT;
            const newSoftCapacity = Math.floor(newIncludedCapacity * (1 + SOFT_BUFFER_PERCENT / 100));
            const newYearlyAmount = newUnits * PRICE_PER_UNIT;

            updateData = {
                unitsPurchased: newUnits,
                includedCapacity: newIncludedCapacity,
                softCapacity: newSoftCapacity,
                yearlyAmount: newYearlyAmount,
                expectedStudents: parsed.expectedStudents || existingSubscription.expectedStudents,
            };
        } else if (parsed.expectedStudents) {
            updateData = {
                expectedStudents: parsed.expectedStudents,
            };
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "No valid update fields provided" },
                { status: 400 }
            );
        }

        // Update subscription and create audit log
        const result = await prisma.$transaction(async (tx) => {
            const updatedSubscription = await tx.schoolSubscription.update({
                where: { schoolId },
                data: updateData,
            });

            // Create audit log for upgrade
            await tx.subscriptionAuditLog.create({
                data: {
                    subscriptionId: existingSubscription.id,
                    action: SubscriptionAction.CAPACITY_UPGRADED,
                    performedBy: parsed.performedBy,
                    previousValue: {
                        unitsPurchased: existingSubscription.unitsPurchased,
                        includedCapacity: existingSubscription.includedCapacity,
                        softCapacity: existingSubscription.softCapacity,
                        yearlyAmount: Number(existingSubscription.yearlyAmount),
                    },
                    newValue: {
                        unitsPurchased: updatedSubscription.unitsPurchased,
                        includedCapacity: updatedSubscription.includedCapacity,
                        softCapacity: updatedSubscription.softCapacity,
                        yearlyAmount: Number(updatedSubscription.yearlyAmount),
                    },
                    reason: parsed.reason || "Capacity upgrade by Super Admin",
                },
            });

            return updatedSubscription;
        });

        return NextResponse.json({
            success: true,
            subscription: result,
        });
    } catch (error) {
        console.error("Error updating subscription:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update subscription" },
            { status: 500 }
        );
    }
}
