// ============================================
// API: /api/razorpay/webhooks/account/route.js
// Handle Razorpay account-related webhooks
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyWebhookSignature, ONBOARDING_STATUS, ACCOUNT_STATUS, KYC_STATUS } from "@/lib/razorpay";

export async function POST(req) {
    try {
        // Get raw body for signature verification
        const body = await req.json();
        const signature = req.headers.get("x-razorpay-signature");

        // Verify signature
        if (!verifyWebhookSignature(body, signature)) {
            console.error("Invalid webhook signature");
            return NextResponse.json(
                { error: "Invalid signature" },
                { status: 401 }
            );
        }

        const event = body.event;
        const payload = body.payload;

        console.log("Razorpay Account Webhook:", event);

        switch (event) {
            case "account.activated":
                await handleAccountActivated(payload);
                break;

            case "account.suspended":
                await handleAccountSuspended(payload);
                break;

            case "account.rejected":
                await handleAccountRejected(payload);
                break;

            case "account.under_review":
                await handleAccountUnderReview(payload);
                break;

            case "account.needs_clarification":
                await handleNeedsClarification(payload);
                break;

            default:
                console.log("Unhandled account webhook event:", event);
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error("Account Webhook Error:", error);
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        );
    }
}

async function handleAccountActivated(payload) {
    const accountId = payload.account?.entity?.id;
    if (!accountId) return;

    // Find school by Razorpay account ID
    const school = await prisma.school.findFirst({
        where: { razorpayAccountId: accountId },
    });

    if (!school) {
        console.log("School not found for account:", accountId);
        return;
    }

    // Update school and onboarding status
    await prisma.$transaction([
        prisma.school.update({
            where: { id: school.id },
            data: {
                razorpayAccountStatus: ACCOUNT_STATUS.ACTIVATED,
                razorpayKycStatus: KYC_STATUS.VERIFIED,
                razorpaySettlementReady: true,
                razorpayOnboardedAt: new Date(),
            },
        }),
        prisma.razorpayOnboarding.update({
            where: { schoolId: school.id },
            data: {
                status: ONBOARDING_STATUS.PAYMENTS_ENABLED,
                kycVerifiedAt: new Date(),
                activatedAt: new Date(),
                webhookData: payload,
                lastError: null,
                errorDetails: null,
            },
        }),
    ]);

    console.log("School activated:", school.name);
    // TODO: Send email notification to school admin
}

async function handleAccountSuspended(payload) {
    const accountId = payload.account?.entity?.id;
    if (!accountId) return;

    const school = await prisma.school.findFirst({
        where: { razorpayAccountId: accountId },
    });

    if (!school) return;

    await prisma.$transaction([
        prisma.school.update({
            where: { id: school.id },
            data: {
                razorpayAccountStatus: ACCOUNT_STATUS.SUSPENDED,
                razorpaySettlementReady: false,
            },
        }),
        prisma.razorpayOnboarding.update({
            where: { schoolId: school.id },
            data: {
                lastError: "Account suspended by Razorpay",
                webhookData: payload,
            },
        }),
    ]);

    console.log("School suspended:", school.name);
    // TODO: Send email notification
}

async function handleAccountRejected(payload) {
    const accountId = payload.account?.entity?.id;
    const reason = payload.account?.entity?.legal_info?.rejection_reason;
    if (!accountId) return;

    const school = await prisma.school.findFirst({
        where: { razorpayAccountId: accountId },
    });

    if (!school) return;

    await prisma.$transaction([
        prisma.school.update({
            where: { id: school.id },
            data: {
                razorpayKycStatus: KYC_STATUS.REJECTED,
                razorpaySettlementReady: false,
            },
        }),
        prisma.razorpayOnboarding.update({
            where: { schoolId: school.id },
            data: {
                status: ONBOARDING_STATUS.REJECTED,
                lastError: reason || "KYC rejected by Razorpay",
                errorDetails: payload,
                webhookData: payload,
            },
        }),
    ]);

    console.log("School rejected:", school.name, reason);
    // TODO: Send email notification with rejection reason
}

async function handleAccountUnderReview(payload) {
    const accountId = payload.account?.entity?.id;
    if (!accountId) return;

    const school = await prisma.school.findFirst({
        where: { razorpayAccountId: accountId },
    });

    if (!school) return;

    await prisma.$transaction([
        prisma.school.update({
            where: { id: school.id },
            data: {
                razorpayKycStatus: KYC_STATUS.PENDING,
            },
        }),
        prisma.razorpayOnboarding.update({
            where: { schoolId: school.id },
            data: {
                status: ONBOARDING_STATUS.KYC_SUBMITTED,
                webhookData: payload,
            },
        }),
    ]);
}

async function handleNeedsClarification(payload) {
    const accountId = payload.account?.entity?.id;
    const clarifications = payload.account?.entity?.requirements?.clarifications;
    if (!accountId) return;

    const school = await prisma.school.findFirst({
        where: { razorpayAccountId: accountId },
    });

    if (!school) return;

    await prisma.razorpayOnboarding.update({
        where: { schoolId: school.id },
        data: {
            lastError: "Additional documents or clarification needed",
            errorDetails: { clarifications, payload },
            webhookData: payload,
        },
    });

    // TODO: Send email notification
}
