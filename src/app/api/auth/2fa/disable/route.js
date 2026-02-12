import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { decryptSecret, verifyToken } from "@/lib/totp";

export async function POST(req) {
    try {
        // Auth check
        const authHeader = req.headers.get("authorization");
        if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const token = authHeader.replace("Bearer ", "");
        const { data: authData, error: authError } = await supabase.auth.getUser(token);
        if (authError || !authData.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { password, totpCode } = body;

        if (!password && !totpCode) {
            return NextResponse.json({ error: "Please provide your password or a TOTP code to disable 2FA" }, { status: 400 });
        }

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: authData.user.id },
            include: { role: true },
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        if (!user.twoFactorEnabled) {
            return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
        }

        let verified = false;

        // Method 1: Verify with password
        if (password) {
            if (user.password === password) {
                verified = true;
            }
        }

        // Method 2: Verify with TOTP code
        if (!verified && totpCode && user.twoFactorSecret) {
            const secret = decryptSecret(user.twoFactorSecret);
            verified = await verifyToken(secret, totpCode);
        }

        if (!verified) {
            return NextResponse.json({ error: "Verification failed. Invalid password or code." }, { status: 401 });
        }

        // Disable 2FA
        await prisma.user.update({
            where: { id: user.id },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorTempSecret: null,
                twoFactorBackupCodes: [],
            },
        });

        return NextResponse.json({
            success: true,
            message: "Two-factor authentication has been disabled.",
        });
    } catch (err) {
        console.error("2FA disable error:", err);
        return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 });
    }
}
