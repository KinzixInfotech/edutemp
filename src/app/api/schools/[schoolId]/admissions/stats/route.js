import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

// GET: Fetch admission statistics
export async function GET(req, props) {
  const params = await props.params;
    const { schoolId } = params;

    try {
        const cacheKey = generateKey('admissions:stats', { schoolId });

        const stats = await remember(cacheKey, async () => {
            // 1. Total Applications
            const totalApplications = await prisma.application.count({
                where: { schoolId },
            });

            // 2. Applications by Stage
            const applicationsByStage = await prisma.application.groupBy({
                by: ["currentStageId"],
                where: { schoolId },
                _count: {
                    _all: true,
                },
            });

            // Fetch stage names for mapping
            const stages = await prisma.stage.findMany({
                where: { schoolId },
                select: { id: true, name: true, order: true },
            });

            const stageStats = stages.map((stage) => {
                const count = applicationsByStage.find((s) => s.currentStageId === stage.id)?._count?._all || 0;
                return {
                    name: stage.name,
                    count,
                    order: stage.order,
                };
            }).sort((a, b) => a.order - b.order);

            // 3. Recent Applications
            const recentApplications = await prisma.application.findMany({
                where: { schoolId },
                orderBy: { submittedAt: "desc" },
                take: 5,
                include: {
                    form: { select: { title: true } },
                    currentStage: { select: { name: true } },
                },
            });

            // 4. Conversion Rate (Enrolled / Total)
            const enrolledCount = stageStats.find(s => s.name === "Enrolled")?.count || 0;
            const conversionRate = totalApplications > 0 ? ((enrolledCount / totalApplications) * 100).toFixed(1) : 0;

            return {
                totalApplications,
                stageStats,
                recentApplications,
                conversionRate,
                enrolledCount
            };
        }, 300);

        return NextResponse.json(stats);
    } catch (error) {
        console.error("Error fetching admission stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch admission stats" },
            { status: 500 }
        );
    }
}
