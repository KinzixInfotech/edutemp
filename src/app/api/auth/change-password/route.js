import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supbase-admin";
import prisma from "@/lib/prisma";

const changePasswordSchema = z.object({
    userId: z.string(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8),
});

export async function POST(req) {
    try {
        const body = await req.json();
        const { userId, currentPassword, newPassword } = changePasswordSchema.parse(body);

        // Verify current password in Prisma if provided
        if (currentPassword) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user || user.password !== currentPassword) {
                return NextResponse.json({ error: "Current password incorrect" }, { status: 401 });
            }
        }

        // Update password in Supabase using admin client
        const { data: updatedUser, error: supaError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword,
        });
        if (supaError) {
            return NextResponse.json({ error: "Supabase password update failed" }, { status: 400 });
        }

        // Update password in Prisma
        await prisma.user.update({
            where: { id: userId },
            data: { password: newPassword, updatedAt: new Date() },
        });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.log(err);

        return NextResponse.json({ error: "Internal server error", message: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
