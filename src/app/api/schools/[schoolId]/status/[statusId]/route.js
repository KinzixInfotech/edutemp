import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invalidatePattern } from "@/lib/cache";

/**
 * GET /api/schools/[schoolId]/status/[statusId]
 * Get viewers list for a status (poster or admin only)
 */
export async function GET(request, { params }) {
    try {
        const { statusId } = await params;

        const status = await prisma.storyStatus.findUnique({
            where: { id: statusId },
            include: {
                views: {
                    include: {
                        viewer: {
                            select: {
                                id: true,
                                name: true,
                                profilePicture: true,
                                role: { select: { name: true } }
                            }
                        }
                    },
                    orderBy: { viewedAt: "desc" }
                },
                user: {
                    select: { id: true, name: true, profilePicture: true }
                }
            }
        });

        if (!status) {
            return NextResponse.json({ error: "Status not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            status: {
                id: status.id,
                type: status.type,
                mediaUrl: status.mediaUrl,
                text: status.text,
                caption: status.caption,
                createdAt: status.createdAt,
                expiryAt: status.expiryAt,
                poster: status.user,
                viewCount: status.views.length,
                viewers: status.views.map(v => ({
                    id: v.viewer.id,
                    name: v.viewer.name,
                    profilePicture: v.viewer.profilePicture,
                    role: v.viewer.role?.name,
                    viewedAt: v.viewedAt
                }))
            }
        });

    } catch (error) {
        console.error("Error fetching status details:", error);
        return NextResponse.json(
            { error: "Failed to fetch status", details: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/schools/[schoolId]/status/[statusId]
 * Delete a status (own or admin)
 */
export async function DELETE(request, { params }) {
    try {
        const { schoolId, statusId } = await params;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        // Fetch status
        const status = await prisma.storyStatus.findUnique({
            where: { id: statusId },
            select: { userId: true, schoolId: true }
        });

        if (!status) {
            return NextResponse.json({ error: "Status not found" }, { status: 404 });
        }

        // Check permission: owner or admin
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true }
        });

        const isOwner = status.userId === userId;
        const isAdmin = ["ADMIN", "DIRECTOR", "PRINCIPAL"].includes(user?.role?.name);

        if (!isOwner && !isAdmin) {
            return NextResponse.json({ error: "Not authorized to delete this status" }, { status: 403 });
        }

        // Delete status (cascade will remove views too)
        await prisma.storyStatus.delete({ where: { id: statusId } });

        // Invalidate caches
        await invalidatePattern(`status:${statusId}`);
        await invalidatePattern(`statusFeed:${schoolId}*`);

        return NextResponse.json({ success: true, message: "Status deleted" });

    } catch (error) {
        console.error("Error deleting status:", error);
        return NextResponse.json(
            { error: "Failed to delete status", details: error.message },
            { status: 500 }
        );
    }
}
