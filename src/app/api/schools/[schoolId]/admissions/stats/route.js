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
        // Cache key includes filters now
        const cacheKey = generateKey('admissions:stats', {
            schoolId, formId, academicYearId, startDate, endDate
        });

        // Reduced cache time for real-time feel (30s)
        const stats = await remember(cacheKey, async () => {
            // 1. Total Applications
            const totalApplications = await prisma.application.count({ where });

            // 2. Applications by Stage
            const applicationsByStage = await prisma.application.groupBy({
                by: ["currentStageId"],
                where,
                _count: { _all: true },
            });

            const stages = await prisma.stage.findMany({
                where: { schoolId },
                select: { id: true, name: true, order: true },
                orderBy: { order: 'asc' }
            });

            const stageStats = stages.map((stage) => {
                const count = applicationsByStage.find((s) => s.currentStageId === stage.id)?._count?._all || 0;
                return {
                    name: stage.name,
                    count,
                    order: stage.order,
                };
            });

            // 3. Recent Applications (Increased limit for list filtering)
            const recentApplications = await prisma.application.findMany({
                where,
                orderBy: { submittedAt: "desc" },
                take: 50,
                include: {
                    form: { select: { title: true } },
                    currentStage: { select: { name: true } },
                },
            });

            // 4. Form-wise Stats
            // FETCH ALL FORMS for the school to ensure table is populated
            // We relax the where clause for forms to show all forms, but stats will respect the filters
            const forms = await prisma.form.findMany({
                where: { schoolId },
                select: { id: true, title: true }
            });

            // Group counts by formId (respecting query filters)
            const formCounts = await prisma.application.groupBy({
                by: ["formId"],
                where,
                _count: { _all: true },
            });

            // Calculate enrolled count per form
            const enrolledStage = stages.find(s => s.name === "Enrolled");
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

            const formStats = forms.map(form => {
                const total = formCounts.find(f => f.formId === form.id)?._count?._all || 0;
                const enrolled = enrolledByForm.find(f => f.formId === form.id)?._count?._all || 0;
                return {
                    formId: form.id,
                    title: form.title,
                    totalApplications: total,
                    enrolledCount: enrolled,
                    conversionRate: total > 0 ? ((enrolled / total) * 100).toFixed(1) : 0
                };
            })
                // Sort by total applications (desc), but keep 0s at bottom
                .sort((a, b) => b.totalApplications - a.totalApplications);

            // If a specific form IS selected, filter the formStats to show only that one (optional, but good for focus)
            const finalFormStats = (formId && formId !== 'all')
                ? formStats.filter(f => f.formId === formId)
                : formStats;

            // 5. Overall Conversion Rate
            const enrolledCount = stageStats.find(s => s.name === "Enrolled")?.count || 0;
            const conversionRate = totalApplications > 0 ? ((enrolledCount / totalApplications) * 100).toFixed(1) : 0;

            return {
                totalApplications,
                stageStats,
                recentApplications,
                conversionRate,
                enrolledCount,
                formStats: finalFormStats
            };
        }, 30);

        return NextResponse.json(stats);
    } catch (error) {
        console.error("Error fetching admission stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch admission stats" },
            { status: 500 }
        );
    }
}
