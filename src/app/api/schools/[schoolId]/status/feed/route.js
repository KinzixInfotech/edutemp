import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateKey, remember, invalidatePattern } from "@/lib/cache";

/**
 * GET /api/schools/[schoolId]/status/feed
 * Returns status feed grouped by user, for mobile consumption.
 * Supports audience filtering based on viewer role.
 */
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(request.url);
        const viewerId = searchParams.get("viewerId");
        const viewerRole = searchParams.get("viewerRole");
        const viewerClassId = searchParams.get("classId");
        const viewerSectionId = searchParams.get("sectionId");

        if (!viewerId) {
            return NextResponse.json({ error: "viewerId is required" }, { status: 400 });
        }

        const now = new Date();

        // Build audience filter based on viewer role
        const audienceFilter = buildAudienceFilter(viewerRole, viewerClassId, viewerSectionId);

        // Use cache with short TTL (60s) for feed
        const cacheKey = generateKey("statusFeed", { schoolId, viewerId, role: viewerRole });
        const feed = await remember(cacheKey, async () => {
            // Fetch all active statuses for this school
            const statuses = await prisma.storyStatus.findMany({
                where: {
                    schoolId,
                    expiryAt: { gt: now },
                    ...audienceFilter,
                },
                orderBy: { createdAt: "asc" },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            profilePicture: true,
                            role: { select: { name: true } }
                        }
                    },
                    views: {
                        select: { id: true, viewerId: true }
                    }
                }
            });

            // Group statuses by user
            const userMap = new Map();

            for (const status of statuses) {
                const uid = status.userId;
                if (!userMap.has(uid)) {
                    userMap.set(uid, {
                        userId: uid,
                        userName: status.user?.name || "Unknown",
                        userAvatar: status.user?.profilePicture || "default.png",
                        userRole: status.user?.role?.name || "UNKNOWN",
                        statuses: [],
                        hasUnseen: false,
                        latestAt: status.createdAt,
                    });
                }

                const group = userMap.get(uid);
                const isSeen = status.views.some(v => v.viewerId === viewerId);
                // Count views excluding poster's own view
                const viewCount = status.views.filter(v => v.viewerId !== uid).length;

                group.statuses.push({
                    id: status.id,
                    type: status.type,
                    mediaUrl: status.mediaUrl,
                    thumbnailUrl: status.thumbnailUrl,
                    text: status.text,
                    caption: status.caption,
                    duration: status.duration,
                    trimStart: status.trimStart,
                    trimEnd: status.trimEnd,
                    createdAt: status.createdAt,
                    expiryAt: status.expiryAt,
                    isSeen,
                    viewCount,
                });

                if (!isSeen) group.hasUnseen = true;
                if (status.createdAt > group.latestAt) {
                    group.latestAt = status.createdAt;
                }
            }

            // Convert map to sorted array (unseen first, then by latest)
            const grouped = Array.from(userMap.values());
            grouped.sort((a, b) => {
                // Viewer's own statuses always first
                if (a.userId === viewerId) return -1;
                if (b.userId === viewerId) return 1;
                // Unseen groups before seen
                if (a.hasUnseen && !b.hasUnseen) return -1;
                if (!a.hasUnseen && b.hasUnseen) return 1;
                // Then by most recent
                return new Date(b.latestAt) - new Date(a.latestAt);
            });

            return grouped;
        }, 60); // 60 second cache

        return NextResponse.json({
            success: true,
            feed
        });

    } catch (error) {
        console.error("Error fetching status feed:", error);
        return NextResponse.json(
            { error: "Failed to fetch feed", details: error.message },
            { status: 500 }
        );
    }
}

/**
 * Build Prisma where clause for audience filtering
 */
function buildAudienceFilter(viewerRole, classId, sectionId) {
    // Admin roles can see everything
    if (["ADMIN", "DIRECTOR", "PRINCIPAL"].includes(viewerRole)) {
        return {};
    }

    // Teachers can see "all" and "teachers" audience
    if (viewerRole === "TEACHER" || viewerRole === "TEACHING_STAFF") {
        return {
            OR: [
                { audience: "all" },
                { audience: "teachers" },
            ]
        };
    }

    // Students & Parents can see "all" and class-targeted statuses matching their class
    const filters = [
        { audience: "all" },
    ];

    // If viewer has a class, include class-targeted statuses
    // We'll check targetData JSON for matching classId
    if (classId) {
        filters.push({ audience: "class" });
    }

    return { OR: filters };
}
