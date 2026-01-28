import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supbase-admin";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for creating a new principal
const createPrincipalSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Valid email required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    contactNumber: z.string().optional(),
});

// GET - Fetch current principal for the school
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        if (!schoolId) {
            return NextResponse.json({ error: "School ID required" }, { status: 400 });
        }

        // Find principal for this school
        const principal = await prisma.principal.findFirst({
            where: { schoolId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profilePicture: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!principal) {
            return NextResponse.json({ principal: null, message: "No principal assigned" });
        }

        return NextResponse.json({
            principal: {
                id: principal.id,
                userId: principal.userId,
                name: principal.user.name,
                email: principal.user.email,
                profilePicture: principal.user.profilePicture,
                department: principal.department,
                joinDate: principal.joinDate,
                createdAt: principal.user.createdAt,
            },
        });
    } catch (error) {
        console.error("❌ Error fetching principal:", error);
        return NextResponse.json({ error: "Failed to fetch principal" }, { status: 500 });
    }
}

// POST - Create a new principal
export async function POST(req, { params }) {
    let createdUserId = null;

    try {
        const { schoolId } = await params;
        const body = await req.json();

        if (!schoolId) {
            return NextResponse.json({ error: "School ID required" }, { status: 400 });
        }

        // Validate input
        const parsed = createPrincipalSchema.parse(body);

        // Check if school already has a principal
        const existingPrincipal = await prisma.principal.findFirst({
            where: { schoolId },
        });

        if (existingPrincipal) {
            return NextResponse.json(
                { error: "School already has a principal. Please remove the existing principal first." },
                { status: 400 }
            );
        }

        // Step 1: Create Supabase Auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: parsed.email,
            password: parsed.password,
            email_confirm: true,
        });

        if (authError || !authData?.user?.id) {
            throw new Error(`Supabase Auth error: ${authError?.message || "Failed to create user"}`);
        }

        createdUserId = authData.user.id;

        // Step 2: Create Prisma records in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Get or create PRINCIPAL role
            const principalRole = await tx.role.upsert({
                where: { name: "PRINCIPAL" },
                update: {},
                create: { name: "PRINCIPAL" },
            });

            // Create User record
            const user = await tx.user.create({
                data: {
                    id: createdUserId,
                    name: parsed.name,
                    email: parsed.email,
                    password: parsed.password, // Store for reference (Supabase handles auth)
                    school: { connect: { id: schoolId } },
                    role: { connect: { id: principalRole.id } },
                    principal: {
                        create: {
                            schoolId: schoolId,
                            joinDate: new Date(),
                        },
                    },
                },
                include: {
                    principal: true,
                },
            });

            return user;
        });

        return NextResponse.json({
            success: true,
            message: "Principal created successfully",
            principal: {
                id: result.principal.id,
                userId: result.id,
                name: result.name,
                email: result.email,
            },
        });
    } catch (error) {
        console.error("❌ Error creating principal:", error);

        // Rollback Supabase user if Prisma failed
        if (createdUserId) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(createdUserId);
                console.log(`🔁 Rolled back Supabase user: ${createdUserId}`);
            } catch (cleanupError) {
                console.error("⚠️ Failed to rollback Supabase user:", cleanupError);
            }
        }

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation error", details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: error.message || "Failed to create principal" },
            { status: 500 }
        );
    }
}

// DELETE - Remove existing principal
export async function DELETE(req, { params }) {
    try {
        const { schoolId } = await params;

        if (!schoolId) {
            return NextResponse.json({ error: "School ID required" }, { status: 400 });
        }

        // Find principal for this school
        const principal = await prisma.principal.findFirst({
            where: { schoolId },
            include: { user: true },
        });

        if (!principal) {
            return NextResponse.json({ error: "No principal found for this school" }, { status: 404 });
        }

        const userId = principal.userId;

        // Step 1: Delete from Supabase Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
            console.error("⚠️ Supabase delete error:", authError);
            // Continue with Prisma deletion even if Supabase fails (user may not exist in auth)
        }

        // Step 2: Delete User from Prisma (cascades to Principal due to onDelete: Cascade)
        await prisma.user.delete({
            where: { id: userId },
        });

        return NextResponse.json({
            success: true,
            message: "Principal removed successfully",
        });
    } catch (error) {
        console.error("❌ Error deleting principal:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete principal" },
            { status: 500 }
        );
    }
}
