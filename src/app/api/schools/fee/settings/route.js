import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Helper to get or create settings
async function getSettings(schoolId) {
    let settings = await prisma.feeSettings.findFirst({
        where: { schoolId },
    });

    if (!settings) {
        settings = await prisma.feeSettings.create({
            data: { schoolId },
        });
    }

    // Also get payment settings
    let paymentSettings = await prisma.schoolPaymentSettings.findUnique({
        where: { schoolId },
    });

    if (!paymentSettings) {
        paymentSettings = await prisma.schoolPaymentSettings.create({
            data: { schoolId },
        });
    }

    return {
        ...settings,
        // Merge payment settings into response structure
        paymentGateway: paymentSettings.provider,
        onlinePaymentEnabled: paymentSettings.isEnabled,
        testMode: paymentSettings.testMode,
        merchantId: paymentSettings.merchantId,
        accessCode: paymentSettings.accessCode,
        secretKey: paymentSettings.secretKey,
        workingKey: paymentSettings.workingKey,
        successUrl: paymentSettings.successUrl,
        failureUrl: paymentSettings.failureUrl,
    };
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");

        if (!schoolId) {
            return NextResponse.json({ error: "School ID required" }, { status: 400 });
        }

        const settings = await getSettings(schoolId);

        // Fetch school data for receipt preview
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                id: true,
                name: true,
                contactNumber: true,
                profilePicture: true,
                location: true,
            },
        });

        return NextResponse.json({ settings, school });
    } catch (error) {
        console.error("Fetch settings error:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { schoolId, type, settings } = body;

        if (!schoolId) {
            return NextResponse.json({ error: "School ID required" }, { status: 400 });
        }

        switch (type) {
            case "general":
                await prisma.feeSettings.updateMany({
                    where: { schoolId },
                    data: {
                        currency: settings.currency,
                        defaultFeeMode: settings.defaultMode,
                        allowPartialPayment: settings.allowPartialPayment,
                        allowAdvancePayment: settings.allowAdvancePayment,
                        lateFeeEnabled: settings.lateFeeEnabled,
                        lateFeeType: settings.lateFeeType,
                        lateFeeAmount: settings.lateFeeAmount,
                        lateFeePercentage: settings.lateFeePercentage,
                        gracePeriodDays: settings.lateFeeDays,
                        autoApplyLateFee: settings.autoApplyLateFee,
                    },
                });
                break;


            case "payment_gateway":
                // Update schoolPaymentSettings table
                await prisma.schoolPaymentSettings.upsert({
                    where: { schoolId },
                    create: {
                        schoolId,
                        provider: settings.paymentGateway,
                        isEnabled: settings.onlinePaymentEnabled,
                        testMode: settings.testMode ?? true,
                        merchantId: settings.merchantId,
                        accessCode: settings.accessCode,
                        secretKey: settings.secretKey,
                        workingKey: settings.workingKey,
                        successUrl: settings.successUrl,
                        failureUrl: settings.failureUrl,
                    },
                    update: {
                        provider: settings.paymentGateway,
                        isEnabled: settings.onlinePaymentEnabled,
                        testMode: settings.testMode ?? true,
                        merchantId: settings.merchantId,
                        accessCode: settings.accessCode,
                        secretKey: settings.secretKey,
                        workingKey: settings.workingKey,
                        successUrl: settings.successUrl,
                        failureUrl: settings.failureUrl,
                    },
                });

                // ALSO update feeSettings table (used by payment portal)
                await prisma.feeSettings.updateMany({
                    where: { schoolId },
                    data: {
                        onlinePaymentEnabled: settings.onlinePaymentEnabled,
                        paymentGateway: settings.paymentGateway,
                        sandboxMode: settings.testMode ?? true,
                    },
                });
                break;

            case "bank_details":
                await prisma.feeSettings.updateMany({
                    where: { schoolId },
                    data: {
                        showBankDetails: settings.showBankDetails,
                        bankName: settings.bankName,
                        accountNumber: settings.accountNumber,
                        ifscCode: settings.ifscCode,
                        accountHolderName: settings.accountHolderName,
                        branchName: settings.branchName,
                        upiId: settings.upiId,
                    },
                });
                break;

            case "receipts":
                await prisma.feeSettings.updateMany({
                    where: { schoolId },
                    data: {
                        receiptPrefix: settings.receiptPrefix,
                        receiptTemplate: settings.receiptTemplate,
                        autoGenerateReceipt: settings.autoGenerate,
                        showSchoolLogo: settings.showSchoolLogo,
                        receiptFooterText: settings.receiptFooterText,
                    },
                });
                break;

            case "notifications":
                await prisma.feeSettings.updateMany({
                    where: { schoolId },
                    data: {
                        emailReminders: settings.emailReminders,
                        smsReminders: settings.smsReminders,
                        pushReminders: settings.pushReminders,
                        reminderDaysBefore: settings.reminderDays,
                        overdueReminders: settings.overdueReminders,
                    },
                });
                break;

            case "discounts":
                await prisma.feeSettings.updateMany({
                    where: { schoolId },
                    data: {
                        siblingDiscountEnabled: settings.siblingDiscountEnabled,
                        siblingDiscountPercentage: settings.siblingDiscountPercentage,
                        earlyPaymentDiscountEnabled: settings.earlyPaymentDiscountEnabled,
                        earlyPaymentDiscountPercentage: settings.earlyPaymentDiscountPercentage,
                        earlyPaymentDays: settings.earlyPaymentDays || 10,
                        earlyPaymentDaysMonthly: settings.earlyPaymentDaysMonthly || 7,
                        earlyPaymentDaysQuarterly: settings.earlyPaymentDaysQuarterly || 15,
                        earlyPaymentDaysHalfYearly: settings.earlyPaymentDaysHalfYearly || 30,
                        earlyPaymentDaysYearly: settings.earlyPaymentDaysYearly || 60,
                        staffWardDiscountEnabled: settings.staffWardDiscountEnabled,
                        staffWardDiscountPercentage: settings.staffWardDiscountPercentage,
                    },
                });
                break;
        }

        // Invalidate cache for payment portal when payment gateway settings change
        if (type === 'payment_gateway') {
            try {
                // Clear all student fee caches for this school
                const redis = (await import('@/lib/redis')).default;
                // Delete pattern: pay:student-fees:*
                const keys = await redis.keys('pay:student-fees:*');
                if (keys.length > 0) {
                    await redis.del(...keys);
                    console.log(`✅ Invalidated ${keys.length} payment cache keys`);
                }
            } catch (cacheError) {
                console.error('Cache invalidation error:', cacheError);
                // Don't fail the request if cache invalidation fails
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Update settings error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
