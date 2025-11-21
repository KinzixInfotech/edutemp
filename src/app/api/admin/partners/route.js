// app/api/admin/partners/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    try {
        const where = {};
        if (status && status !== "ALL") {
            where.status = status;
        }

        const partners = await prisma.partner.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                accountManager: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            partners,
            total: partners.length
        });

    } catch (error) {
        console.error("Fetch partners error:", error);
        return NextResponse.json(
            { error: "Failed to fetch partners" },
            { status: 500 }
        );
    }
}

export async function PATCH(req) {
    try {
        const body = await req.json();
        const {
            partnerId,
            status,
            level,
            commissionRate,
            renewalRate,
            accountManagerId,
            rejectedReason
        } = body;

        if (!partnerId) {
            return NextResponse.json(
                { error: "Partner ID is required" },
                { status: 400 }
            );
        }

        const updateData = {};
        if (status) updateData.status = status;
        if (level) updateData.level = level;
        if (commissionRate) updateData.commissionRate = parseFloat(commissionRate);
        if (renewalRate) updateData.renewalRate = parseFloat(renewalRate);
        if (accountManagerId) updateData.accountManagerId = accountManagerId;
        if (rejectedReason) updateData.rejectedReason = rejectedReason;

        // If approving, set approval details
        if (status === 'ACTIVE') {
            updateData.approvedAt = new Date();
            // You can add approvedBy from auth context
        }

        const partner = await prisma.partner.update({
            where: { id: partnerId },
            data: updateData,
            include: {
                user: true
            }
        });

        // Log activity
        await prisma.partnerActivity.create({
            data: {
                partnerId,
                activityType: "PROFILE_UPDATE",
                description: `Partner profile updated. Status: ${status || 'N/A'}`,
                metadata: { status, level, commissionRate }
            }
        });

        return NextResponse.json({
            success: true,
            message: "Partner updated successfully",
            partner
        });

    } catch (error) {
        console.error("Update partner error:", error);
        return NextResponse.json(
            { error: "Failed to update partner" },
            { status: 500 }
        );
    }
}