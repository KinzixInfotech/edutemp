/**
 * Capacity Helper - Subscription & Student Limit Enforcement
 * 
 * Used to check if a school can add more students based on their subscription.
 * Also provides logging for capacity exceeded events.
 */

import prisma from "@/lib/prisma";
import { SubscriptionAction } from "@prisma/client";

/**
 * Check if a school can add more students
 * @param {string} schoolId - The school's UUID
 * @param {number} additionalStudents - Number of students to add (default: 1)
 * @returns {Promise<{canAdd: boolean, currentCount: number, softCapacity: number, remaining: number, message?: string}>}
 */
export async function checkCapacity(schoolId, additionalStudents = 1) {
    const subscription = await prisma.schoolSubscription.findUnique({
        where: { schoolId },
        select: {
            id: true,
            softCapacity: true,
            includedCapacity: true,
            status: true,
        },
    });

    if (!subscription) {
        return {
            canAdd: false,
            currentCount: 0,
            softCapacity: 0,
            remaining: 0,
            message: "No subscription found for this school. Please contact EduBreezy.",
        };
    }

    // Check subscription status
    if (["EXPIRED", "SUSPENDED", "CANCELLED"].includes(subscription.status)) {
        return {
            canAdd: false,
            currentCount: 0,
            softCapacity: subscription.softCapacity,
            remaining: 0,
            message: `Subscription is ${subscription.status.toLowerCase()}. Please contact EduBreezy to reactivate.`,
        };
    }

    // Get current student count
    const currentCount = await prisma.student.count({
        where: { schoolId },
    });

    const remaining = subscription.softCapacity - currentCount;
    const canAdd = remaining >= additionalStudents;
    const utilizationPercent = Math.round((currentCount / subscription.softCapacity) * 100);

    let message = null;
    if (!canAdd) {
        message = "You have reached your student capacity limit. Please contact EduBreezy to upgrade your plan.";
    } else if (utilizationPercent >= 90) {
        message = `Warning: You are at ${utilizationPercent}% capacity. Only ${remaining} student slots remaining.`;
    }

    return {
        canAdd,
        currentCount,
        softCapacity: subscription.softCapacity,
        remaining,
        utilizationPercent,
        message,
    };
}

/**
 * Log a capacity exceeded event
 * @param {string} schoolId - The school's UUID
 * @param {string} performedBy - User ID who attempted the action
 * @param {number} attemptedCount - Number of students attempted to add
 * @returns {Promise<{success: boolean, logged: boolean}>}
 */
export async function logCapacityExceeded(schoolId, performedBy, attemptedCount = 1) {
    try {
        const subscription = await prisma.schoolSubscription.findUnique({
            where: { schoolId },
        });

        if (!subscription) {
            return { success: false, logged: false, error: "Subscription not found" };
        }

        const currentCount = await prisma.student.count({
            where: { schoolId },
        });

        await prisma.subscriptionAuditLog.create({
            data: {
                subscriptionId: subscription.id,
                action: SubscriptionAction.CAPACITY_EXCEEDED,
                performedBy,
                previousValue: {
                    currentStudents: currentCount,
                    softCapacity: subscription.softCapacity,
                },
                newValue: {
                    attemptedToAdd: attemptedCount,
                    wouldExceedBy: (currentCount + attemptedCount) - subscription.softCapacity,
                },
                reason: "School attempted to add students beyond capacity limit",
            },
        });

        return { success: true, logged: true };
    } catch (error) {
        console.error("Error logging capacity exceeded:", error);
        return { success: false, logged: false, error: error.message };
    }
}

/**
 * Get subscription usage statistics
 * @param {string} schoolId - The school's UUID
 * @returns {Promise<object>} Usage statistics
 */
export async function getSubscriptionUsage(schoolId) {
    const subscription = await prisma.schoolSubscription.findUnique({
        where: { schoolId },
        select: {
            id: true,
            expectedStudents: true,
            unitsPurchased: true,
            includedCapacity: true,
            softCapacity: true,
            yearlyAmount: true,
            billingStartDate: true,
            billingEndDate: true,
            status: true,
            isTrial: true,
            trialEndsAt: true,
        },
    });

    if (!subscription) {
        return null;
    }

    const currentCount = await prisma.student.count({
        where: { schoolId },
    });

    const remaining = subscription.softCapacity - currentCount;
    const utilizationPercent = Math.round((currentCount / subscription.softCapacity) * 100);
    const daysUntilRenewal = subscription.billingEndDate
        ? Math.ceil((new Date(subscription.billingEndDate) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

    return {
        ...subscription,
        currentStudents: currentCount,
        remaining,
        utilizationPercent,
        daysUntilRenewal,
        isNearLimit: utilizationPercent >= 90,
        isAtLimit: remaining <= 0,
        isRenewalDueSoon: daysUntilRenewal !== null && daysUntilRenewal <= 30,
    };
}

/**
 * Pricing constants for external use
 */
export const PRICING = {
    PRICE_PER_UNIT: 10500, // ₹10,500 per 100 students / year
    BASE_PRICE_PER_UNIT: 15000, // ₹15,000 before discount
    STUDENTS_PER_UNIT: 100,
    SOFT_BUFFER_PERCENT: 5,
    DISCOUNT_PERCENT: 30,
};

/**
 * Calculate subscription price
 * @param {number} expectedStudents - Expected number of students
 * @returns {object} Pricing breakdown
 */
export function calculatePrice(expectedStudents) {
    const units = Math.ceil(expectedStudents / PRICING.STUDENTS_PER_UNIT);
    const includedCapacity = units * PRICING.STUDENTS_PER_UNIT;
    const softCapacity = Math.floor(includedCapacity * (1 + PRICING.SOFT_BUFFER_PERCENT / 100));
    const yearlyAmount = units * PRICING.PRICE_PER_UNIT;
    const baseAmount = units * PRICING.BASE_PRICE_PER_UNIT;
    const discount = baseAmount - yearlyAmount;

    return {
        units,
        includedCapacity,
        softCapacity,
        yearlyAmount,
        baseAmount,
        discount,
        perStudentYearly: expectedStudents > 0 ? Math.round(yearlyAmount / expectedStudents) : 0,
    };
}
