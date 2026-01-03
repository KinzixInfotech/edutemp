import { NextResponse } from 'next/server';
import { messaging } from '@/lib/firebase-admin';
import prisma from "@/lib/prisma";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: "Please provide ?userId=... query parameter" }, { status: 400 });
        }

        console.log(`🧪 Triggering Web Push Test for user: ${userId}`);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { fcmToken: true, name: true, email: true }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!user.fcmToken) {
            return NextResponse.json({
                error: "No FCM Token found for this user. Please enable notifications on the dashboard first.",
                user: { name: user.name, email: user.email }
            }, { status: 404 });
        }

        const messagePayload = {
            token: user.fcmToken,
            notification: {
                title: "🔔 Test Web Push",
                body: `Hello ${user.name || 'User'}! This is a test notification from the server.`,
            },
            webpush: {
                fcmOptions: {
                    link: "/dashboard"
                },
                notification: {
                    icon: '/icon.png'
                }
            }
        };

        const response = await messaging.send(messagePayload);

        return NextResponse.json({
            success: true,
            message: "Test Notification Sent",
            messageId: response,
            target: {
                name: user.name,
                email: user.email,
                tokenStart: user.fcmToken.substring(0, 15) + "..."
            }
        });

    } catch (error) {
        console.error('Test Notification Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}