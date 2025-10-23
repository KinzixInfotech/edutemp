// /api/auth/verify-password/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import prisma from "@/lib/prisma";

const verifyPasswordSchema = z.object({
    userId: z.string(),
    currentPassword: z.string().min(1),
});

export async function POST(req) {
    try {
        const body = await req.json();
        const { userId, currentPassword } = verifyPasswordSchema.parse(body);

        // Verify the request is authenticated via Supabase session
        // const authHeader = req.headers.get("Authorization");
        // if (!authHeader?.startsWith("Bearer ")) {
        //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        // }

        // const token = authHeader.split(" ")[1];
        // const { data: sessionData, error: sessionError } = await supabase.auth.getUser(token);

        // if (sessionError || !sessionData.user || sessionData.user.id !== userId) {
        //     return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        // }

        // Get user from Prisma DB
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || !user.password) {
            return NextResponse.json({ error: "User not found or no password set" }, { status: 404 });
        }

        // Direct plain text comparison (since password is not hashed)
        if (user.password !== currentPassword) {
            return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Password verification error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
