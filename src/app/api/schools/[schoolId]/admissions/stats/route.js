import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

// GET: Fetch admission statistics
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    // Filters
    const formId = searchParams.get('formId');
    const academicYearId = searchParams.get('academicYearId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause for applications
    const where = { schoolId };

    if (formId && formId !== 'all') where.formId = formId;
    if (academicYearId && academicYearId !== 'all') where.academicYearId = academicYearId;
    if (startDate && endDate) {
        where.submittedAt = {
            gte: new Date(startDate),
            lte: new Date(endDate)
        };
    }

    try {
        // Cache key includes filters
        const cacheKey = generateKey('admissions:stats', {
            schoolId, formId, academicYearId, startDate, endDate
        });

        // Cache for 60s
        const stats = await remember(cacheKey, async () => {
            // ── Phase 1: All independent queries in parallel ──────────
            const [
                totalApplications,
                applicationsByStage,
                stages,
                forms,
                formCounts,
                recentApplications
            ] = await Promise.all([
                // 1. Total count
                prisma.application.count({ where }),

                // 2. Group by stage
                prisma.application.groupBy({
                    by: ["currentStageId"],
                    where,
                    _count: { _all: true },
                }),

                // 3. All stages for this school
                prisma.stage.findMany({
                    where: { schoolId },
                    select: { id: true, name: true, order: true },
                    orderBy: { order: 'asc' }
                }),

                // 4. All forms for this school
                prisma.form.findMany({
                    where: { schoolId },
                    select: { id: true, title: true, viewCount: true }
                }),

                // 5. Application counts grouped by form
                prisma.application.groupBy({
                    by: ["formId"],
                    where,
                    _count: { _all: true },
                }),

                // 6. Recent applications
                prisma.application.findMany({
                    where,
                    orderBy: { submittedAt: "desc" },
                    take: 50,
                    select: {
                        id: true,
                        applicantName: true,
                        applicantEmail: true,
                        submittedAt: true,
                        form: { select: { title: true } },
                        currentStage: { select: { name: true } },
                    },
                }),
            ]);

            // ── Phase 2: Dependent query (needs stages result) ────────
            const stageStats = stages.map((stage) => {
                const count = applicationsByStage.find((s) => s.currentStageId === stage.id)?._count?._all || 0;
                return { name: stage.name, count, order: stage.order };
            });

            const enrolledStage = stages.find(s => s.name === "Enrolled");

            // Only run the enrolled groupBy if the stage exists
            let enrolledByForm = [];
            if (enrolledStage) {
                enrolledByForm = await prisma.application.groupBy({
                    by: ["formId"],
                    where: {
                        ...where,
                        currentStageId: enrolledStage.id
                    },
                    _count: { _all: true }
                });
            }

            // ── Assemble form stats ───────────────────────────────────
            const formStats = forms.map(form => {
                const total = formCounts.find(f => f.formId === form.id)?._count?._all || 0;
                const enrolled = enrolledByForm.find(f => f.formId === form.id)?._count?._all || 0;
                return {
                    formId: form.id,
                    title: form.title,
                    totalApplications: total,
                    enrolledCount: enrolled,
                    viewCount: form.viewCount || 0,
                    conversionRate: total > 0 ? ((enrolled / total) * 100).toFixed(1) : 0
                };
            }).sort((a, b) => b.totalApplications - a.totalApplications);

            const finalFormStats = (formId && formId !== 'all')
                ? formStats.filter(f => f.formId === formId)
                : formStats;

            // Overall stats
            const enrolledCount = stageStats.find(s => s.name === "Enrolled")?.count || 0;
            const conversionRate = totalApplications > 0 ? ((enrolledCount / totalApplications) * 100).toFixed(1) : 0;
            const totalFormViews = forms.reduce((sum, f) => sum + (f.viewCount || 0), 0);

            return {
                totalApplications,
                stageStats,
                recentApplications,
                conversionRate,
                enrolledCount,
                totalFormViews,
                formStats: finalFormStats
            };
        }, 60);

        return NextResponse.json(stats);
    } catch (error) {
        console.error("Error fetching admission stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch admission stats" },
            { status: 500 }
        );
    }
}
