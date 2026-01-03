import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invalidatePattern } from "@/lib/cache";
import { sendNotification } from "@/lib/notifications/notificationHelper";

/**
 * Broadcast API for Director/Principal
 * POST - Send school-wide announcement
 * Creates: Notice + Push Notifications + In-app Notifications
 */

export async function POST(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await req.json();
        const {
            title,
            message,
            category = 'GENERAL', // GENERAL, EMERGENCY, EXAM, HOLIDAY, EVENT
            audience = 'ALL', // ALL, STAFF, STUDENTS, PARENTS
            priority = 'NORMAL', // LOW, NORMAL, HIGH, URGENT
            senderId,
            expiryDays = 30, // Notice expiry in days
            imageUrl = null, // Optional image URL from UploadThing
        } = body;

        // Validate required fields
        if (!title || !message || !senderId) {
            return NextResponse.json(
                { error: "Missing required fields: title, message, senderId" },
                { status: 400 }
            );
        }

        // Get sender info
        const sender = await prisma.user.findUnique({
            where: { id: senderId },
            select: {
                name: true,
                role: { select: { name: true } }
            },
        });

        if (!sender) {
            return NextResponse.json(
                { error: "Sender not found" },
                { status: 404 }
            );
        }

        // Calculate expiry date
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);

        // 1. Create Notice for noticeboard
        const notice = await prisma.notice.create({
            data: {
                schoolId,
                title,
                description: message,
                subtitle: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
                category,
                audience,
                priority,
                status: 'PUBLISHED',
                createdById: senderId,
                issuedBy: sender.name || 'Administration',
                issuerRole: sender.role?.name || 'Staff',
                publishedAt: new Date(),
                expiryDate,
                fileUrl: imageUrl, // Store image URL
            },
        });

        // 2. Determine target users based on audience
        let targetOptions = {};
        switch (audience) {
            case 'ALL':
                targetOptions = { allUsers: true };
                break;
            case 'STAFF':
                targetOptions = {
                    userTypes: ['TEACHING_STAFF', 'ADMIN', 'NON_TEACHING_STAFF']
                };
                break;
            case 'STUDENTS':
                targetOptions = {
                    userTypes: ['STUDENT'],
                    includeParents: true, // Include parents when targeting students
                };
                break;
            case 'PARENTS':
                targetOptions = { userTypes: ['PARENT'] };
                break;
            case 'TEACHERS':
                targetOptions = { userTypes: ['TEACHING_STAFF'] };
                break;
            default:
                targetOptions = { allUsers: true };
        }

        // 3. Send push notifications + create in-app notifications
        const notificationResult = await sendNotification({
            schoolId,
            title: category === 'EMERGENCY' ? `🚨 ${title}` : `📢 ${title}`,
            message: `${message}\n\nFrom: ${sender.name || 'Admin'} (${sender.role?.name || 'Staff'})`,
            type: category === 'EMERGENCY' ? 'NOTICE' : 'NOTICE',
            priority: category === 'EMERGENCY' ? 'URGENT' : priority,
            icon: category === 'EMERGENCY' ? '🚨' : '📢',
            targetOptions,
            senderId,
            metadata: {
                noticeId: notice.id,
                category,
                audience,
            },
            actionUrl: '/noticeboard',
            sendPush: true,
        });

        // Invalidate caches
        await invalidatePattern(`notices:*${schoolId}*`);
        await invalidatePattern(`notifications:*${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: 'Broadcast sent successfully',
            notice: {
                id: notice.id,
                title: notice.title,
                publishedAt: notice.publishedAt,
            },
            notifications: {
                sent: notificationResult.count || 0,
                targetUsers: notificationResult.targetUserIds?.length || 0,
            },
        });
    } catch (error) {
        console.error("Error sending broadcast:", error);
        return NextResponse.json(
            { error: "Failed to send broadcast", details: error.message },
            { status: 500 }
        );
    }
}

// GET - Fetch recent broadcasts
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "20");

        const notices = await prisma.notice.findMany({
            where: {
                schoolId,
                status: 'PUBLISHED',
            },
            select: {
                id: true,
                title: true,
                subtitle: true,
                description: true,
                category: true,
                audience: true,
                priority: true,
                publishedAt: true,
                viewCount: true,
                issuedBy: true,
                issuerRole: true,
                fileUrl: true, // Include image
            },
            orderBy: { publishedAt: 'desc' },
            take: limit,
        });

        return NextResponse.json({
            broadcasts: notices,
            total: notices.length,
        });
    } catch (error) {
        console.error("Error fetching broadcasts:", error);
        return NextResponse.json(
            { error: "Failed to fetch broadcasts", details: error.message },
            { status: 500 }
        );
    }
}
