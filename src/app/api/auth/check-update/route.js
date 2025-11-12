 // File: app/api/auth/check-update/route.js
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req) {
    try {
        const body = await req.json();
        const { userId, lastUpdatedAt, } = body;

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // Fetch user info from DB
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                updatedAt: true,
                profilePicture: true,
                name: true,
                schoolId: true,
                // Add any other config fields you track
                // e.g., accountVersion, configVersion
                fcmToken: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Convert incoming lastUpdatedAt string to Date
        const clientUpdatedAt = lastUpdatedAt ? new Date(lastUpdatedAt) : null;
        const serverUpdatedAt = user.updatedAt;

        // Decide if refresh is needed
        const refresh =
            !clientUpdatedAt || serverUpdatedAt > clientUpdatedAt; // replace "1.0" with actual server config version

        return NextResponse.json({
            refresh,
            serverData: refresh ? user : null, // only send data if refresh is needed
        });
    } catch (err) {
        console.error("[CHECK_UPDATE]", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
