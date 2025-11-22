import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// app/api/partners/payouts/route.js
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");

    if (!partnerId) {
        return NextResponse.json(
            { error: "partnerId is required" },
            { status: 400 }
        );
    }

    try {
        const payouts = await prisma.partnerPayout.findMany({
            where: { partnerId },
            include: {
                commissions: {
                    select: {
                        id: true,
                        schoolName: true,
                        commissionAmount: true,
                        type: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            payouts,
            total: payouts.length
        });

    } catch (error) {
        console.error("Fetch payouts error:", error);
        return NextResponse.json(
            { error: "Failed to fetch payouts" },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { partnerId, amount, paymentMethod } = body;

        if (!partnerId || !amount) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get partner details
        const partner = await prisma.partner.findUnique({
            where: { id: partnerId },
            select: {
                bankName: true,
                accountNumber: true,
                ifscCode: true,
                upiId: true
            }
        });

        if (!partner) {
            return NextResponse.json(
                { error: "Partner not found" },
                { status: 404 }
            );
        }

        // Validate payment details
        if (paymentMethod === "BANK_TRANSFER" && (!partner.bankName || !partner.accountNumber)) {
            return NextResponse.json(
                { error: "Bank details not configured" },
                { status: 400 }
            );
        }

        if (paymentMethod === "UPI" && !partner.upiId) {
            return NextResponse.json(
                { error: "UPI ID not configured" },
                { status: 400 }
            );
        }

        // Get unpaid commissions
        const unpaidCommissions = await prisma.partnerCommission.findMany({
            where: {
                partnerId,
                isPaid: false
            },
            select: { id: true }
        });

        if (unpaidCommissions.length === 0) {
            return NextResponse.json(
                { error: "No pending commissions to process" },
                { status: 400 }
            );
        }

        // Calculate total
        const totalPending = await prisma.partnerCommission.aggregate({
            where: { partnerId, isPaid: false },
            _sum: { commissionAmount: true }
        });

        if (amount > (totalPending._sum.commissionAmount || 0)) {
            return NextResponse.json(
                { error: "Requested amount exceeds pending commission" },
                { status: 400 }
            );
        }

        // Create payout request
        const payout = await prisma.$transaction(async (tx) => {
            const newPayout = await tx.partnerPayout.create({
                data: {
                    partnerId,
                    amount,
                    paymentMethod,
                    commissionIds: unpaidCommissions.map(c => c.id),
                    status: "PENDING",
                    requestedAt: new Date()
                },
                include: {
                    commissions: true
                }
            });

            // Log activity
            await tx.partnerActivity.create({
                data: {
                    partnerId,
                    activityType: "PAYOUT_REQUEST",
                    description: `Payout request for ₹${amount}`,
                    metadata: { payoutId: newPayout.id }
                }
            });

            return newPayout;
        });

        return NextResponse.json({
            success: true,
            message: "Payout request submitted successfully",
            payout
        }, { status: 201 });

    } catch (error) {
        console.error("Create payout error:", error);
        return NextResponse.json(
            { error: "Failed to create payout request" },
            { status: 500 }
        );
    }
}
