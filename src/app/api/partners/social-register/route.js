// app/api/partners/social-register/route.js
// Called after social OAuth (Google/Apple) when user has no Partner profile yet
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            userId,
            email,
            name,
            contactPerson,
            contactPhone,
            companyName,
            address,
            city,
            state,
            postalCode,
            dateOfBirth,
            avatarUrl,
        } = body;

        // Validation
        if (!userId || !email || !name) {
            return NextResponse.json(
                { error: "Missing required fields: userId, email, name" },
                { status: 400 }
            );
        }

        // Check if partner profile already exists
        const existingPartner = await prisma.partner.findFirst({
            where: { userId },
        });

        if (existingPartner) {
            return NextResponse.json({
                success: true,
                message: "Partner profile already exists",
                partner: existingPartner,
            });
        }

        // Check if User record already exists in our DB (Supabase created the auth user)
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        // Generate unique referral code
        const referralCode = `REF${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.edubreezy.com";
        const referralLink = `${baseUrl}/register?ref=${referralCode}`;

        const result = await prisma.$transaction(async (tx) => {
            let user;

            if (existingUser) {
                // User record exists – ensure it has the PARTNER role
                const partnerRole = await tx.role.findFirst({
                    where: { name: "PARTNER" },
                });

                if (!partnerRole) {
                    throw new Error("Partner role not found in database");
                }

                user = await tx.user.update({
                    where: { id: userId },
                    data: {
                        roleId: partnerRole.id,
                        name: existingUser.name || name,
                        ...(avatarUrl && { profilePicture: avatarUrl }),
                        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
                    },
                });
            } else {
                // Create User record
                const partnerRole = await tx.role.findFirst({
                    where: { name: "PARTNER" },
                });

                if (!partnerRole) {
                    throw new Error("Partner role not found in database");
                }

                user = await tx.user.create({
                    data: {
                        id: userId,
                        email,
                        password: "SOCIAL_AUTH", // Placeholder – Supabase handles auth
                        name,
                        roleId: partnerRole.id,
                        status: "ACTIVE",
                        ...(avatarUrl && { profilePicture: avatarUrl }),
                        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
                    },
                });
            }

            // Create Partner profile
            const partner = await tx.partner.create({
                data: {
                    userId: user.id,
                    role: "AFFILIATE",
                    level: "SILVER",
                    status: "PENDING",
                    contactPerson: contactPerson || name,
                    contactEmail: email,
                    contactPhone: contactPhone || "",
                    companyName: companyName || name,
                    address: address || "",
                    city: city || "",
                    state: state || "",
                    postalCode: postalCode || "",
                    referralCode,
                    referralLink,
                    commissionRate: 10,
                    renewalRate: 5,
                },
            });

            return { user, partner };
        });

        return NextResponse.json(
            {
                success: true,
                message: "Partner profile created via social auth. Awaiting admin approval.",
                partner: {
                    id: result.partner.id,
                    name: result.user.name,
                    email: result.user.email,
                    status: result.partner.status,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Social partner registration error:", error);
        return NextResponse.json(
            { error: error.message || "Social registration failed" },
            { status: 500 }
        );
    }
}
