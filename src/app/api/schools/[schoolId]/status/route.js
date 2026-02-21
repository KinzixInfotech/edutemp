import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateKey, setCache, invalidatePattern } from "@/lib/cache";

// Allowed roles for posting status
const ALLOWED_POSTER_ROLES = ["ADMIN", "DIRECTOR", "PRINCIPAL", "TEACHER", "TEACHING_STAFF"];

/**
 * POST /api/schools/[schoolId]/status
 * Create a new story status
 */
export async function POST(request, { params }) {
    try {
        const { schoolId } = await params;
        const body = await request.json();
        const { userId, type, mediaUrl, thumbnailUrl, text, caption, audience, targetData, duration, trimStart, trimEnd } = body;

        if (!userId || !type) {
            return NextResponse.json({ error: "userId and type are required" }, { status: 400 });
        }

        // Validate type
        if (!["image", "video", "text"].includes(type)) {
            return NextResponse.json({ error: "Invalid type. Must be image, video, or text" }, { status: 400 });
        }

        // Validate media
        if ((type === "image" || type === "video") && !mediaUrl) {
            return NextResponse.json({ error: "mediaUrl is required for image/video status" }, { status: 400 });
        }
        if (type === "text" && !text) {
            return NextResponse.json({ error: "text is required for text status" }, { status: 400 });
        }

        // Check user role
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true }
        });

        if (!user || !ALLOWED_POSTER_ROLES.includes(user.role?.name)) {
            return NextResponse.json({ error: "You are not authorized to post status" }, { status: 403 });
        }

        // Set expiry 24h from now
        const expiryAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const status = await prisma.storyStatus.create({
            data: {
                schoolId,
                userId,
                type,
                mediaUrl: mediaUrl || null,
                thumbnailUrl: thumbnailUrl || null,
                text: text || null,
                caption: caption || null,
                audience: audience || "all",
                targetData: targetData || null,
                duration: duration || null,
                trimStart: trimStart || null,
                trimEnd: trimEnd || null,
                expiryAt,
            },
            include: {
                user: {
                    select: { id: true, name: true, profilePicture: true, role: { select: { name: true } } }
                }
            }
        });

        // Cache status metadata in Redis (TTL 24h)
        const cacheKey = generateKey("status", status.id);
        await setCache(cacheKey, {
            id: status.id,
            userId: status.userId,
            type: status.type,
            mediaUrl: status.mediaUrl,
            thumbnailUrl: status.thumbnailUrl,
            text: status.text,
            caption: status.caption,
            audience: status.audience,
            expiryAt: status.expiryAt,
        }, 86400);

        // Invalidate feed cache
        await invalidatePattern(`statusFeed:${schoolId}*`);

        return NextResponse.json({
            success: true,
            status
        }, { status: 201 });

    } catch (error) {
        console.error("Error creating status:", error);
        return NextResponse.json(
            { error: "Failed to create status", details: error.message },
            { status: 500 }
        );
    }
}

/**
 * GET /api/schools/[schoolId]/status
 * List all statuses (admin view with pagination)
 */
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const showExpired = searchParams.get("showExpired") === "true";

        const where = {
            schoolId,
            ...(showExpired ? {} : { expiryAt: { gt: new Date() } })
        };

        const [statuses, total] = await Promise.all([
            prisma.storyStatus.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: {
                        select: { id: true, name: true, profilePicture: true, role: { select: { name: true } } }
                    },
                    _count: { select: { views: true } }
                }
            }),
            prisma.storyStatus.count({ where })
        ]);

        return NextResponse.json({
            statuses,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error fetching statuses:", error);
        return NextResponse.json(
            { error: "Failed to fetch statuses", details: error.message },
            { status: 500 }
        );
    }
}
