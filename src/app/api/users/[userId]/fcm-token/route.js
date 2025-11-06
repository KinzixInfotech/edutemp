// ==========================================
// 4. BACKEND: FCM Token Registration API
// ==========================================

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// File: app/api/users/[userId]/fcm-token/route.js
export async function POST(request, { params }) {
    try {
        const { userId } = params;
        const { fcmToken } = await request.json();

        await prisma.user.update({
            where: { id: userId },
            data: { fcmToken }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to update FCM token' },
            { status: 500 }
        );
    }
}


export async function DELETE(request, { params }) {
    try {
        const { userId } = params;

        await prisma.user.update({
            where: { id: userId },
            data: { fcmToken: null }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to delete FCM token' },
            { status: 500 }
        );
    }
}