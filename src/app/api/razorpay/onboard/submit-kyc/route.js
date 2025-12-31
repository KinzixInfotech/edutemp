// ============================================
// API: /api/razorpay/onboard/submit-kyc/route.js
// Submit KYC documents to Razorpay
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRazorpayClient, ONBOARDING_STATUS, KYC_STATUS } from "@/lib/razorpay";

export async function POST(req) {
    try {
        const body = await req.json();
        const { schoolId, stakeholder, bankDetails, documents } = body;

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

        if (!school.razorpayAccountId) {
            return NextResponse.json(
                { error: "School does not have a Razorpay linked account. Create one first." },
                { status: 400 }
            );
        }

        const razorpay = getRazorpayClient();
        const accountId = school.razorpayAccountId;

        // Step 1: Add stakeholder (required for Route)
        if (stakeholder) {
            try {
                await razorpay.stakeholders.create(accountId, {
                    name: stakeholder.name,
                    email: stakeholder.email,
                    phone: {
                        primary: stakeholder.phone,
                    },
                    relationship: {
                        director: stakeholder.isDirector || true,
                        executive: stakeholder.isExecutive || false,
                    },
                    notes: {
                        school_id: schoolId,
                    },
                });

                // Update onboarding
                await prisma.razorpayOnboarding.update({
                    where: { schoolId },
                    data: {
                        stakeholderName: stakeholder.name,
                        stakeholderEmail: stakeholder.email,
                    },
                });
            } catch (stakeholderError) {
                console.error("Stakeholder creation failed:", stakeholderError);
                // Continue - stakeholder might already exist
            }
        }

        // Step 2: Add bank account
        if (bankDetails) {
            try {
                await razorpay.fundAccounts?.create({
                    account_id: accountId,
                    contact_id: accountId, // Same as account for Route
                    account_type: "bank_account",
                    bank_account: {
                        ifsc: bankDetails.ifsc,
                        beneficiary_name: bankDetails.accountName,
                        account_number: bankDetails.accountNumber,
                    },
                });

                // Update onboarding with bank details
                await prisma.razorpayOnboarding.update({
                    where: { schoolId },
                    data: {
                        bankAccountName: bankDetails.accountName,
                        bankAccountNumber: bankDetails.accountNumber?.slice(-4), // Store only last 4 digits
                        bankIfscCode: bankDetails.ifsc,
                        bankName: bankDetails.bankName,
                    },
                });
            } catch (bankError) {
                console.error("Bank account creation failed:", bankError);
                // Not critical - can be done via dashboard
            }
        }

        // Step 3: Request product configuration (for route payments)
        try {
            const product = await razorpay.products?.requestProductConfiguration(accountId, {
                product_name: "route",
                requested_at: Math.floor(Date.now() / 1000),
            });

            if (product?.id) {
                await prisma.razorpayOnboarding.update({
                    where: { schoolId },
                    data: {
                        productId: product.id,
                    },
                });
            }
        } catch (productError) {
            console.error("Product configuration failed:", productError);
            // Continue - might be auto-configured
        }

        // Update status to KYC_SUBMITTED
        await prisma.$transaction([
            prisma.school.update({
                where: { id: schoolId },
                data: {
                    razorpayKycStatus: KYC_STATUS.PENDING,
                },
            }),
            prisma.razorpayOnboarding.update({
                where: { schoolId },
                data: {
                    status: ONBOARDING_STATUS.KYC_SUBMITTED,
                    kycSubmittedAt: new Date(),
                    legalInfo: documents || {},
                    lastError: null,
                    errorDetails: null,
                },
            }),
        ]);

        return NextResponse.json({
            success: true,
            message: "KYC submitted successfully. Verification typically takes 1-2 business days.",
            status: ONBOARDING_STATUS.KYC_SUBMITTED,
            accountId,
            nextStep: "Wait for KYC verification (we'll notify you via email)",
        });

    } catch (error) {
        console.error("Submit KYC Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to submit KYC" },
            { status: 500 }
        );
    }
}
