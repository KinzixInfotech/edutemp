// File: app/api/users/[userId]/fcm-token/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { userId } = params;
        const body = await request.json();
        const { fcmToken } = body;

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

        console.log('📱 Registering FCM token for user:', userId);
        console.log('🔑 Token:', fcmToken.substring(0, 20) + '...');

        // Update user's FCM token
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { fcmToken },
            select: {
                id: true,
                email: true,
                fcmToken: true
            }
        });

        console.log('✅ FCM token registered successfully for:', updatedUser.email);

        return NextResponse.json({
            success: true,
            message: 'FCM token registered successfully',
            userId: updatedUser.id
        });

    } catch (error) {
        console.error('❌ Error registering FCM token:', error);

        // Handle specific Prisma errors
        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'FCM token already exists' },
                { status: 409 }
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

        console.log('🗑️ Deleting FCM token for user:', userId);

        await prisma.user.update({
            where: { id: userId },
            data: { fcmToken: null }
        });

        console.log('✅ FCM token deleted successfully');

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