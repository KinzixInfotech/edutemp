import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { decryptSecret, verifyToken, encryptSecret, generateBackupCodes } from "@/lib/totp";

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
        const { code } = body;

        if (!code || code.length !== 6) {
            return NextResponse.json({ error: "Please enter a valid 6-digit code" }, { status: 400 });
        }

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: authData.user.id },
            include: { role: true },
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Role gate
        if (!["ADMIN", "SUPER_ADMIN"].includes(user.role?.name)) {
            return NextResponse.json({ error: "2FA is only available for Admin accounts" }, { status: 403 });
        }

        // Must have temp secret (from setup step)
        if (!user.twoFactorTempSecret) {
            return NextResponse.json({ error: "No pending 2FA setup. Please start the setup again." }, { status: 400 });
        }

        // Decrypt temp secret and verify the code
        const secret = decryptSecret(user.twoFactorTempSecret);
        const isValid = await verifyToken(secret, code);

        if (!isValid) {
            return NextResponse.json({ error: "Invalid code. Please try again with a fresh code from your authenticator app." }, { status: 400 });
        }

        // Generate backup codes
        const { codes: backupCodes, hashedCodes } = generateBackupCodes();

        // Move temp secret → permanent, enable 2FA, store hashed backup codes
        const encryptedPermanent = encryptSecret(secret);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                twoFactorEnabled: true,
                twoFactorSecret: encryptedPermanent,
                twoFactorTempSecret: null, // clear temp
                twoFactorBackupCodes: hashedCodes,
            },
        });

        return NextResponse.json({
            success: true,
            backupCodes, // plaintext — shown to user ONCE
            message: "Two-factor authentication has been enabled successfully.",
        });
    } catch (err) {
        console.error("2FA verify-setup error:", err);
        return NextResponse.json({ error: "Failed to verify 2FA setup" }, { status: 500 });
    }
}
