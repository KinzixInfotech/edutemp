// app/api/partners/profile/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

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
        const partner = await prisma.partner.findUnique({
            where: { userId: partnerId },
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
            }
        });

        if (!partner) {
            return NextResponse.json(
                { error: "Partner not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            partner
        });

    } catch (error) {
        console.error("Fetch partner profile error:", error);
        return NextResponse.json(
            { error: "Failed to fetch partner profile" },
            { status: 500 }
        );
    }
}

export async function PATCH(req) {
    try {
        const body = await req.json();
        const {
            partnerId,
            companyName,
            contactPerson,
            contactEmail,
            contactPhone,
            alternatePhone,
            address,
            city,
            state,
            postalCode,
            gstin,
            panNumber,
            bankName,
            accountNumber,
            accountHolder,
            ifscCode,
            upiId
        } = body;

        if (!partnerId) {
            return NextResponse.json(
                { error: "Partner ID is required" },
                { status: 400 }
            );
        }

        const updateData = {};

        // Business information
        if (companyName) updateData.companyName = companyName;
        if (contactPerson) updateData.contactPerson = contactPerson;
        if (contactEmail) updateData.contactEmail = contactEmail;
        if (contactPhone) updateData.contactPhone = contactPhone;
        if (alternatePhone !== undefined) updateData.alternatePhone = alternatePhone;
        if (address) updateData.address = address;
        if (city) updateData.city = city;
        if (state) updateData.state = state;
        if (postalCode) updateData.postalCode = postalCode;
        if (gstin !== undefined) updateData.gstin = gstin;
        if (panNumber !== undefined) updateData.panNumber = panNumber;

        // Bank details
        if (bankName) updateData.bankName = bankName;
        if (accountNumber) updateData.accountNumber = accountNumber;
        if (accountHolder) updateData.accountHolder = accountHolder;
        if (ifscCode) updateData.ifscCode = ifscCode;
        if (upiId !== undefined) updateData.upiId = upiId;

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
                description: "Partner profile updated"
            }
        });

        return NextResponse.json({
            success: true,
            message: "Profile updated successfully",
            partner
        });

    } catch (error) {
        console.error("Update partner profile error:", error);
        return NextResponse.json(
            { error: "Failed to update profile" },
            { status: 500 }
        );
    }
}