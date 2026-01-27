import { sendNotification } from '@/lib/notifications/notificationHelper';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Ensure prisma is imported

export const GET = async (request) => {
    try {
        console.log('[Test API] Auto-fetching context...');

        // 1. Fetch a valid school
        const school = await prisma.school.findFirst();
        if (!school) {
            return NextResponse.json({ error: 'No school found in database' }, { status: 404 });
        }

        // 2. Fetch a valid sender (e.g., first admin or user)
        const sender = await prisma.user.findFirst({
            where: { schoolId: school.id }
        });
        const senderId = sender?.id || 'system-test-id';

        console.log(`[Test API] Using School: ${school.id}, Sender: ${senderId}`);
        console.log('[Test API] Triggering BULK notification to ALL users...');

        const result = await sendNotification({
            schoolId: school.id,
            title: 'Test Broadcast 🚀',
            message: `This is a broadcast test to ALL users in ${school.name || 'the school'}! via Background Queue`,
            type: 'GENERAL',
            priority: 'HIGH',
            targetOptions: { allUsers: true }, // Send to everyone
            senderId: senderId
        });

        return NextResponse.json({
            message: 'Broadcast trigger initiated',
            details: {
                schoolId: school.id,
                schoolName: school.name,
                senderId
            },
            result,
            info: 'Check server logs. The worker should now fetch ALL user IDs and process them.'
        });
    } catch (error) {
        console.error('[Test API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
};

export const dynamic = 'force-dynamic';