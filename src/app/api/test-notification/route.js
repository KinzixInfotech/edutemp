import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications/notificationHelper';
import { messaging } from '@/lib/firebase-admin';
import prisma from "@/lib/prisma";

export async function GET(request) {
    try {
        // Hardcoded IDs from your logs
        const schoolId = '140d4c69-f100-4432-b1b9-4e35b7e723af';
        const parentUserId = '0e3dba29-dc5d-43e7-948b-2258d1d75b9c';

        console.log('🧪 Triggering Test Notification...');

        const result = await sendNotification({
            schoolId,
            title: "🔔 Test Notification",
            message: "This is a direct test to verify that Push Notifications are working!",
            type: 'GENERAL',
            targetOptions: { userIds: [parentUserId] },
            icon: '🧪'
        });

        // -------------------------------------------------------------
        // FALLBACK TEST: Send WITHOUT Channel ID (Directly)
        // -------------------------------------------------------------
        console.log('🧪 Triggering Fallback Test (No Channel ID)...');

        // Get token manually
        const user = await prisma.user.findUnique({
            where: { id: parentUserId },
            select: { fcmToken: true }
        });

        let fallbackResult = null;

        if (user?.fcmToken) {
            fallbackResult = await messaging.sendEachForMulticast({
                tokens: [user.fcmToken],
                // NO notification object -> Triggers background/quit handler in App
                data: {
                    type: 'TEST_DATA_ONLY',
                    title: "🔔 Data-Only Notification",
                    body: "This message was rendered by the APP (Local), not System.",
                    forceDisplay: 'true'
                },
            });
            console.log('Fallback sent:', fallbackResult);
        }

        return NextResponse.json({
            success: true,
            message: "Test Notification Triggered",
            result
        });
    } catch (error) {
        console.error('Test Notification Error:', error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}