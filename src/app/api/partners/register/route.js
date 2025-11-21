// app/api/partners/register/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            email,
            password,
            name,
            role,
            contactPerson,
            contactPhone,
            companyName,
            address,
            city,
            state,
            postalCode
        } = body;

        // Validation
        if (!email || !password || !name || !contactPerson || !contactPhone) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email already registered" },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate unique referral code
        const referralCode = `REF${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        const referralLink = `${process.env.NEXT_PUBLIC_APP_URL}/register?ref=${referralCode}`;

        // Create user and partner in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create user with partner role
            const partnerRole = await tx.role.findFirst({
                where: { name: "PARTNER" }
            });

            if (!partnerRole) {
                throw new Error("Partner role not found");
            }

            const user = await tx.user.create({
                data: {
                    id: crypto.randomUUID(),
                    email,
                    password: hashedPassword,
                    name,
                    roleId: partnerRole.id,
                    status: "ACTIVE"
                }
            });

            // Create partner profile
            const partner = await tx.partner.create({
                data: {
                    userId: user.id,
                    role: role || "AFFILIATE",
                    level: "SILVER",
                    status: "PENDING",
                    contactPerson,
                    contactEmail: email,
                    contactPhone,
                    companyName: companyName || name,
                    address: address || "",
                    city: city || "",
                    state: state || "",
                    postalCode: postalCode || "",
                    referralCode,
                    referralLink,
                    commissionRate: 10,
                    renewalRate: 5
                }
            });

            return { user, partner };
        });

        return NextResponse.json({
            success: true,
            message: "Partner registration successful. Awaiting admin approval.",
            partner: {
                id: result.partner.id,
                name: result.user.name,
                email: result.user.email,
                status: result.partner.status
            }
        }, { status: 201 });

    } catch (error) {
        console.error("Partner registration error:", error);
        return NextResponse.json(
            { error: error.message || "Registration failed" },
            { status: 500 }
        );
    }
}