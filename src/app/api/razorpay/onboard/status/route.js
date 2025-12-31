// ============================================
// API: /api/razorpay/onboard/status/route.js
// Get onboarding status for a school
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRazorpayClient, canAcceptPayments, isTestMode } from "@/lib/razorpay";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");

        if (!schoolId) {
            return NextResponse.json(
                { error: "schoolId is required" },
                { status: 400 }
            );
        }

        // Fetch school with onboarding
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            include: { razorpayOnboarding: true },
        });

        if (!school) {
            return NextResponse.json(
                { error: "School not found" },
                { status: 404 }
            );
        }

        const onboarding = school.razorpayOnboarding;

        // If no onboarding started
        if (!onboarding) {
            return NextResponse.json({
                status: "NOT_STARTED",
                accountStatus: school.razorpayAccountStatus || "not_created",
                kycStatus: school.razorpayKycStatus || "not_started",
                canAcceptPayments: false,
                isTestMode: isTestMode(),
                commission: {
                    type: school.platformCommissionType,
                    value: school.platformCommissionValue,
                },
                nextStep: "Create Razorpay linked account",
            });
        }

        // Sync status from Razorpay if we have an account
        if (school.razorpayAccountId) {
            try {
                const razorpay = getRazorpayClient();
                const account = await razorpay.accounts.fetch(school.razorpayAccountId);

                // Update local status if changed
                if (account.status !== school.razorpayAccountStatus) {
                    await prisma.school.update({
                        where: { id: schoolId },
                        data: {
                            razorpayAccountStatus: account.status,
                            razorpaySettlementReady: account.status === "activated",
                            razorpayOnboardedAt: account.status === "activated" ? new Date() : null,
                        },
                    });
                }
            } catch (fetchError) {
                console.error("Failed to fetch Razorpay account status:", fetchError);
                // Continue with cached data
            }
        }

        // Determine next step
        let nextStep = null;
        switch (onboarding.status) {
            case "CREATED":
                nextStep = "Submit KYC and bank details";
                break;
            case "KYC_SUBMITTED":
                nextStep = "Waiting for Razorpay to verify KYC (1-2 business days)";
                break;
            case "KYC_VERIFIED":
                nextStep = "Final verification in progress";
                break;
            case "PAYMENTS_ENABLED":
                nextStep = "Ready to accept payments!";
                break;
            case "REJECTED":
                nextStep = `KYC rejected: ${onboarding.lastError || 'Please resubmit'}`;
                break;
        }

        return NextResponse.json({
            status: onboarding.status,
            accountId: school.razorpayAccountId,
            accountStatus: school.razorpayAccountStatus,
            kycStatus: school.razorpayKycStatus,
            settlementReady: school.razorpaySettlementReady,
            canAcceptPayments: canAcceptPayments(school),
            isTestMode: isTestMode(),
            commission: {
                type: school.platformCommissionType,
                value: school.platformCommissionValue,
            },
            onboarding: {
                businessName: onboarding.businessName,
                businessType: onboarding.businessType,
                businessEmail: onboarding.businessEmail,
                bankName: onboarding.bankName,
                bankAccountLast4: onboarding.bankAccountNumber,
                kycSubmittedAt: onboarding.kycSubmittedAt,
                kycVerifiedAt: onboarding.kycVerifiedAt,
                activatedAt: onboarding.activatedAt,
            },
            error: onboarding.lastError,
            nextStep,
        });

    } catch (error) {
        console.error("Get Onboarding Status Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to get status" },
            { status: 500 }
        );
    }
}

// POST - Refresh status from Razorpay
export async function POST(req) {
    try {
        const body = await req.json();
        const { schoolId } = body;

        if (!schoolId) {
            return NextResponse.json(
                { error: "schoolId is required" },
                { status: 400 }
            );
        }

        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            include: { razorpayOnboarding: true },
        });

        if (!school?.razorpayAccountId) {
            return NextResponse.json(
                { error: "No Razorpay account found" },
                { status: 400 }
            );
        }

        const razorpay = getRazorpayClient();
        const account = await razorpay.accounts.fetch(school.razorpayAccountId);

        // Map Razorpay status to our status
        let newKycStatus = school.razorpayKycStatus;
        let newOnboardingStatus = school.razorpayOnboarding?.status;
        let settlementReady = school.razorpaySettlementReady;

        if (account.status === "activated") {
            newKycStatus = "verified";
            newOnboardingStatus = "PAYMENTS_ENABLED";
            settlementReady = true;
        } else if (account.status === "suspended") {
            settlementReady = false;
        }

        // Update database
        await prisma.$transaction([
            prisma.school.update({
                where: { id: schoolId },
                data: {
                    razorpayAccountStatus: account.status,
                    razorpayKycStatus: newKycStatus,
                    razorpaySettlementReady: settlementReady,
                    razorpayOnboardedAt: settlementReady ? new Date() : null,
                },
            }),
            prisma.razorpayOnboarding.update({
                where: { schoolId },
                data: {
                    status: newOnboardingStatus,
                    ...(settlementReady && { activatedAt: new Date() }),
                    webhookData: account,
                },
            }),
        ]);

        return NextResponse.json({
            success: true,
            accountStatus: account.status,
            kycStatus: newKycStatus,
            onboardingStatus: newOnboardingStatus,
            settlementReady,
        });

    } catch (error) {
        console.error("Refresh Status Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to refresh status" },
            { status: 500 }
        );
    }
}
