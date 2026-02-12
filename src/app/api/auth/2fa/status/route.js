import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

export async function GET(req) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const token = authHeader.replace("Bearer ", "");
        const { data: authData, error: authError } = await supabase.auth.getUser(token);
        if (authError || !authData.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: authData.user.id },
            select: { twoFactorEnabled: true },
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        return NextResponse.json({ twoFactorEnabled: user.twoFactorEnabled });
    } catch (err) {
        console.error("2FA status error:", err);
        return NextResponse.json({ error: "Failed to get 2FA status" }, { status: 500 });
    }
}
