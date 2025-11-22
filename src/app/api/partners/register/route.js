// app/api/partners/register/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supbase-admin";

export async function POST(req) {
    let createdUserId = null;

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

        // Check if user exists in local DB
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email already registered" },
                { status: 400 }
            );
        }

        // Create Supabase User
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { name: name }
        });

        if (authError || !authUser?.user?.id) {
            throw new Error(`Supabase Auth Error: ${authError?.message || "Unknown error"}`);
        }

        createdUserId = authUser.user.id;

        // Generate unique referral code
        const referralCode = `REF${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const referralLink = `${baseUrl}/register?ref=${referralCode}`;

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
                    id: createdUserId, // Use Supabase ID
                    email,
                    password: password, // Storing plain/hashed depending on previous logic, but Supabase handles auth now.
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

        // Cleanup Supabase user if Prisma transaction failed
        if (createdUserId) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(createdUserId);
                console.log(`🧹 Deleted Supabase user: ${createdUserId}`);
            } catch (cleanupError) {
                console.error("⚠️ Supabase cleanup failed:", cleanupError);
            }
        }

        return NextResponse.json(
            { error: error.message || "Registration failed" },
            { status: 500 }
        );
    }
}