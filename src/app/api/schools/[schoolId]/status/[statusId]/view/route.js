import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

/**
 * GET /api/schools/[schoolId]/status/[statusId]/view
 * Returns list of viewers for a status (excludes poster's own view)
 * Cached for 30 seconds
 */
export async function GET(request, { params }) {
    try {
        const { schoolId, statusId } = await params;

        const cacheKey = generateKey("statusViewers", { statusId });

        const result = await remember(cacheKey, async () => {
            // Get the status to know who posted it
            const status = await prisma.storyStatus.findUnique({
                where: { id: statusId },
                select: { userId: true }
            });

            if (!status) return { error: "Status not found" };

            // Fetch all views EXCLUDING the poster's own view
            const views = await prisma.storyStatusView.findMany({
                where: {
                    statusId,
                    viewerId: { not: status.userId },
                },
                include: {
                    viewer: {
                        select: {
                            id: true,
                            name: true,
                            profilePicture: true,
                            role: { select: { name: true } },
                        }
                    }
                },
                orderBy: { viewedAt: "desc" }
            });

            // Enrich parent viewers with child info via StudentParentLink
            const enrichedViews = await Promise.all(
                views.map(async (view) => {
                    const roleName = view.viewer?.role?.name;
                    let childInfo = null;

                    if (roleName === "PARENT") {
                        try {
                            const parent = await prisma.parent.findFirst({
                                where: { userId: view.viewer.id, schoolId },
                                include: {
                                    studentLinks: {
                                        where: { isActive: true },
                                        include: {
                                            student: {
                                                select: {
                                                    name: true,
                                                    class: { select: { className: true } },
                                                    section: { select: { name: true } },
                                                }
                                            }
                                        }
                                    }
                                }
                            });
                            if (parent?.studentLinks?.length > 0) {
                                childInfo = parent.studentLinks.map(link => ({
                                    name: link.student?.name,
                                    class: link.student?.class?.className,
                                    section: link.student?.section?.name,
                                    relation: link.relation,
                                }));
                            }
                        } catch (err) {
                            console.error("Error enriching parent viewer:", err);
                        }
                    }

                    return {
                        id: view.id,
                        viewerId: view.viewerId,
                        viewerName: view.viewer?.name || "Unknown",
                        viewerAvatar: view.viewer?.profilePicture,
                        viewerRole: roleName,
                        childInfo,
                        viewedAt: view.viewedAt,
                    };
                })
            );

            return {
                count: enrichedViews.length,
                viewers: enrichedViews,
            };
        }, 30); // 30 second cache

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 404 });
        }

        return NextResponse.json({ success: true, ...result });

    } catch (error) {
        console.error("Error fetching viewers:", error);
        return NextResponse.json(
            { error: "Failed to fetch viewers", details: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST /api/schools/[schoolId]/status/[statusId]/view
 * Record a view for this status
 */
export async function POST(request, { params }) {
    try {
        const { schoolId, statusId } = await params;
        const body = await request.json();
        const { viewerId } = body;

        if (!viewerId) {
            return NextResponse.json({ error: "viewerId is required" }, { status: 400 });
        }

        // Upsert view (don't create duplicates)
        await prisma.storyStatusView.upsert({
            where: {
                statusId_viewerId: { statusId, viewerId }
            },
            create: { statusId, viewerId },
            update: { viewedAt: new Date() },
        });

        // Invalidate viewer cache for this status
        await invalidatePattern(`statusViewers:*${statusId}*`);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error recording view:", error);
        return NextResponse.json(
            { error: "Failed to record view", details: error.message },
            { status: 500 }
        );
    }
}
