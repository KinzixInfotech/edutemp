// File: app/api/users/[userId]/fcm-token/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { userId } = params;
        const body = await request.json();
        const { fcmToken, platform } = body;

        // Validate inputs
        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        if (!fcmToken) {
            return NextResponse.json(
                { error: 'FCM token is required' },
                { status: 400 }
            );
        }

        console.log('📱 Registering FCM token for user:', userId, '| platform:', platform || 'unknown');
        console.log('🔑 Token:', fcmToken.substring(0, 20) + '...');

        // Upsert into UserDevice table — if this token already exists,
        // re-assign it to the current user and update lastActive.
        // This handles cross-role login on the same physical device.
        const device = await prisma.userDevice.upsert({
            where: { fcmToken },
            update: {
                userId,
                platform: platform || null,
                isActive: true,
                lastActive: new Date(),
            },
            create: {
                userId,
                fcmToken,
                platform: platform || null,
                isActive: true,
                lastActive: new Date(),
            },
        });

        // Also keep the legacy fcmToken field in sync for backward compatibility
        await prisma.user.update({
            where: { id: userId },
            data: { fcmToken },
        });

        console.log('✅ FCM device registered:', device.id, '| platform:', device.platform);

        return NextResponse.json({
            success: true,
            message: 'FCM token registered successfully',
            userId,
            deviceId: device.id,
            platform: device.platform,
        });

    } catch (error) {
        console.error('❌ Error registering FCM token:', error);

        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                error: 'Failed to register FCM token',
                message: error.message,
                code: error.code
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request, props) {
    const params = await props.params;
    try {
        const { userId } = params;

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Check if body has a specific token to delete
        let specificToken = null;
        try {
            const body = await request.json();
            specificToken = body?.fcmToken;
        } catch {
            // No body — delete all devices for this user
        }

        if (specificToken) {
            // Delete one specific device
            console.log('🗑️ Deleting specific device for user:', userId);
            await prisma.userDevice.deleteMany({
                where: { userId, fcmToken: specificToken },
            });
        } else {
            // Delete ALL devices for this user (full logout)
            console.log('🗑️ Deleting ALL devices for user:', userId);
            await prisma.userDevice.deleteMany({
                where: { userId },
            });
        }

        // Clear legacy field
        await prisma.user.update({
            where: { id: userId },
            data: { fcmToken: null },
        });

        console.log('✅ FCM token(s) deleted successfully');

        return NextResponse.json({
            success: true,
            message: 'FCM token deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting FCM token:', error);

        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                error: 'Failed to delete FCM token',
                message: error.message
            },
            { status: 500 }
        );
    }
}