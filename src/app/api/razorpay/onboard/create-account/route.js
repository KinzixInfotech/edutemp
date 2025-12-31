// ============================================
// API: /api/razorpay/onboard/create-account/route.js
// Create Razorpay linked account for a school
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRazorpayClient, ONBOARDING_STATUS, ACCOUNT_STATUS, KYC_STATUS, DEFAULT_COMMISSION } from "@/lib/razorpay";

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

        // Fetch school
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

        // Check if already has linked account
        if (school.razorpayAccountId) {
            return NextResponse.json({
                success: false,
                message: "School already has a Razorpay linked account",
                accountId: school.razorpayAccountId,
                status: school.razorpayAccountStatus,
            });
        }

        // Get Razorpay client
        const razorpay = getRazorpayClient();

        // Create linked account on Razorpay
        // Using Razorpay Route API
        const accountData = {
            email: body.email || `${school.schoolCode}@edubreezy.com`,
            phone: body.phone || school.contactNumber?.replace(/\D/g, '').slice(-10),
            type: "route",
            legal_business_name: school.name,
            business_type: body.businessType || "educational_institution",
            contact_name: body.contactName || school.name,
            profile: {
                category: "education",
                subcategory: "school",
                addresses: {
                    registered: {
                        street1: school.location || "Address",
                        city: body.city || "City",
                        state: body.state || "State",
                        postal_code: body.postalCode || "000000",
                        country: "IN",
                    },
                },
            },
            legal_info: body.legalInfo || {},
        };

        let linkedAccount;
        try {
            linkedAccount = await razorpay.accounts.create(accountData);
        } catch (razorpayError) {
            console.error("Razorpay account creation failed:", razorpayError);

            // Update onboarding with error
            await prisma.razorpayOnboarding.upsert({
                where: { schoolId },
                update: {
                    status: ONBOARDING_STATUS.REJECTED,
                    lastError: razorpayError.message || "Failed to create linked account",
                    errorDetails: razorpayError,
                    retryCount: { increment: 1 },
                },
                create: {
                    schoolId,
                    status: ONBOARDING_STATUS.REJECTED,
                    lastError: razorpayError.message || "Failed to create linked account",
                    errorDetails: razorpayError,
                },
            });

            return NextResponse.json(
                { error: razorpayError.error?.description || "Failed to create Razorpay account" },
                { status: 400 }
            );
        }

        // Update school with linked account info
        await prisma.school.update({
            where: { id: schoolId },
            data: {
                razorpayAccountId: linkedAccount.id,
                razorpayAccountStatus: ACCOUNT_STATUS.CREATED,
                razorpayKycStatus: KYC_STATUS.NOT_STARTED,
                platformCommissionType: DEFAULT_COMMISSION.type,
                platformCommissionValue: DEFAULT_COMMISSION.value,
            },
        });

        // Create/update onboarding record
        await prisma.razorpayOnboarding.upsert({
            where: { schoolId },
            update: {
                status: ONBOARDING_STATUS.CREATED,
                linkedAccountId: linkedAccount.id,
                businessName: school.name,
                businessType: body.businessType || "educational_institution",
                businessEmail: accountData.email,
                businessPhone: accountData.phone,
                contactName: body.contactName,
                lastError: null,
                errorDetails: null,
            },
            create: {
                schoolId,
                status: ONBOARDING_STATUS.CREATED,
                linkedAccountId: linkedAccount.id,
                businessName: school.name,
                businessType: body.businessType || "educational_institution",
                businessEmail: accountData.email,
                businessPhone: accountData.phone,
                contactName: body.contactName,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Razorpay linked account created successfully",
            accountId: linkedAccount.id,
            status: ACCOUNT_STATUS.CREATED,
            nextStep: "Submit KYC documents",
        });

    } catch (error) {
        console.error("Create Razorpay Account Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create Razorpay account" },
            { status: 500 }
        );
    }
}
