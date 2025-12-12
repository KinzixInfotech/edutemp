import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supbase-admin";
import { delCache } from "@/lib/cache";

export async function DELETE(req, { params }) {
    try {
        const { userId } = params;
        const body = await req.json();
        const { role } = body;

        if (!userId || !role) {
            return NextResponse.json(
                { error: "User ID and role are required" },
                { status: 400 }
            );
        }

        // Step 1: Delete from Supabase Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
            console.error("Supabase auth deletion error:", authError);
            // Continue with soft delete even if Supabase deletion fails
        }

        // Step 2: Delete from role-specific table
        if (role === "LIBRARIAN") {
            await prisma.librarian.update({
                where: { userId },
                data: { deletedAt: new Date() },
            });
            await delCache("librarians:all");
        } else if (role === "ACCOUNTANT") {
            await prisma.accountant.update({
                where: { userId },
                data: { deletedAt: new Date() },
            });
            await delCache("accountants:all");
        }

        // Step 3: Soft delete user
        await prisma.user.update({
            where: { id: userId },
            data: {
                status: "INACTIVE",
                deletedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        console.error("Delete user error:", error);
        return NextResponse.json(
            { error: "Failed to delete user", message: error.message },
            { status: 500 }
        );
    }
}

export async function PATCH(req, { params }) {
    try {
        const { userId } = params;
        const body = await req.json();
        const { name, email, password, role } = body;

        if (!userId) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        // Update user in database
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;

        await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        // Update password in Supabase if provided
        if (password) {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                password,
            });

            if (error) {
                console.error("Supabase password update error:", error);
                // Continue anyway - the name/email update succeeded
            }
        }

        // Invalidate cache
        if (role === "LIBRARIAN") {
            await delCache("librarians:all");
        } else if (role === "ACCOUNTANT") {
            await delCache("accountants:all");
        }

        return NextResponse.json({
            success: true,
            message: "User updated successfully",
        });
    } catch (error) {
        console.error("Update user error:", error);
        return NextResponse.json(
            { error: "Failed to update user", message: error.message },
            { status: 500 }
        );
    }
}
