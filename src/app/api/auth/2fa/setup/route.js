import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { generateSecret, generateQRCode, encryptSecret } from "@/lib/totp";

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

        // Get user with role
        const user = await prisma.user.findUnique({
            where: { id: authData.user.id },
            include: { role: true },
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Role gate
        if (!["ADMIN", "SUPER_ADMIN"].includes(user.role?.name)) {
            return NextResponse.json({ error: "2FA is only available for Admin accounts" }, { status: 403 });
        }

        // Already enabled
        if (user.twoFactorEnabled) {
            return NextResponse.json({ error: "2FA is already enabled. Disable it first to reconfigure." }, { status: 400 });
        }

        // Generate TOTP secret
        const secret = generateSecret();
        const { qrDataUrl, manualKey } = await generateQRCode(user.email, secret);

        // Encrypt and store temp secret
        const encryptedSecret = encryptSecret(secret);
        await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorTempSecret: encryptedSecret },
        });

        return NextResponse.json({
            qrCode: qrDataUrl,
            manualKey,
        });
    } catch (err) {
        console.error("2FA setup error:", err);
        return NextResponse.json({ error: "Failed to setup 2FA" }, { status: 500 });
    }
}
