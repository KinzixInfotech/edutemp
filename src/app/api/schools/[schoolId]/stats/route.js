import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { remember, generateKey } from "@/lib/cache"

// Pricing constants (must match Step5ERPPlan.jsx)
const PRICE_PER_UNIT = 12000;
const BASE_PRICE_PER_UNIT = 17143;
const STUDENTS_PER_UNIT = 100;
const SOFT_BUFFER_PERCENT = 5;

export async function GET(request, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const cacheKey = generateKey('school:stats', { schoolId });

        const stats = await remember(cacheKey, async () => {
            const [
                studentCount,
                teachingStaffCount,
                nonTeachingStaffCount,
                parentCount,
                classCount,
                sectionCount,
                vehicleCount,
                routeCount,
                userCount,
                feeStats,
                recentStudents,
                classDistribution,
                subscription,
            ] = await Promise.all([
                prisma.student.count({ where: { schoolId } }),
                prisma.teachingStaff.count({ where: { schoolId } }),
                prisma.nonTeachingStaff.count({ where: { schoolId } }),
                prisma.parent.count({ where: { schoolId } }),
                prisma.class.count({ where: { schoolId } }),
                prisma.section.count({ where: { class: { schoolId } } }),
                prisma.vehicle.count({ where: { schoolId } }),
                prisma.route.count({ where: { schoolId } }),
                prisma.user.count({ where: { schoolId } }),

                // Fee aggregation
                prisma.studentFee.aggregate({
                    where: { schoolId },
                    _sum: {
                        finalAmount: true,
                        paidAmount: true,
                        balanceAmount: true,
                    },
                }),

                // Recent 5 students (Student has no createdAt, use admissionDate)
                prisma.student.findMany({
                    where: { schoolId },
                    take: 5,
                    orderBy: { admissionDate: 'desc' },
                    select: {
                        userId: true,
                        name: true,
                        admissionNo: true,
                        admissionDate: true,
                        class: { select: { className: true } },
                    },
                }),

                // Student count per class for chart
                prisma.class.findMany({
                    where: { schoolId },
                    select: {
                        className: true,
                        _count: { select: { students: true } },
                    },
                    orderBy: { className: 'asc' },
                }),

                // Subscription / plan data
                prisma.schoolSubscription.findUnique({
                    where: { schoolId },
                }),
            ]);

            // Calculate plan info (from subscription or defaults)
            const planInfo = subscription ? {
                expectedStudents: subscription.expectedStudents,
                unitsPurchased: subscription.unitsPurchased,
                includedCapacity: subscription.includedCapacity,
                softCapacity: subscription.softCapacity,
                yearlyAmount: Number(subscription.yearlyAmount),
                pricePerUnit: Number(subscription.pricePerUnit),
                billingStartDate: subscription.billingStartDate,
                billingEndDate: subscription.billingEndDate,
                isTrial: subscription.isTrial,
                trialDays: subscription.trialDays,
                trialEndsAt: subscription.trialEndsAt,
                status: subscription.status,
                currentStudents: studentCount,
                capacityUsed: subscription.includedCapacity > 0
                    ? Math.round((studentCount / subscription.includedCapacity) * 100)
                    : 0,
                isNearLimit: studentCount >= subscription.includedCapacity * 0.9,
                isOverLimit: studentCount > subscription.softCapacity,
                perStudentYearly: subscription.expectedStudents > 0
                    ? Math.round(Number(subscription.yearlyAmount) / subscription.expectedStudents)
                    : 0,
                savings: (subscription.unitsPurchased * BASE_PRICE_PER_UNIT) - Number(subscription.yearlyAmount),
            } : null;

            return {
                counts: {
                    students: studentCount,
                    teachingStaff: teachingStaffCount,
                    nonTeachingStaff: nonTeachingStaffCount,
                    totalStaff: teachingStaffCount + nonTeachingStaffCount,
                    parents: parentCount,
                    classes: classCount,
                    sections: sectionCount,
                    vehicles: vehicleCount,
                    routes: routeCount,
                    users: userCount,
                },
                fees: {
                    totalAmount: feeStats._sum.finalAmount || 0,
                    collected: feeStats._sum.paidAmount || 0,
                    pending: feeStats._sum.balanceAmount || 0,
                },
                recentStudents,
                classDistribution: classDistribution.map(c => ({
                    className: c.className,
                    students: c._count.students,
                })),
                plan: planInfo,
            };
        }, 180); // Cache 3 minutes

        return NextResponse.json(stats);
    } catch (err) {
        console.error("[SCHOOL_STATS]", err);
        return NextResponse.json({ error: "Failed to fetch school stats" }, { status: 500 });
    }
}
