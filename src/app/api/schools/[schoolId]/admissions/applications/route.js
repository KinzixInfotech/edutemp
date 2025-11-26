import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Fetch applications
export async function GET(req, { params }) {
    const { schoolId } = await params;
    const { searchParams } = new URL(req.url);
    const stageId = searchParams.get("stageId");
    const formId = searchParams.get("formId");

    try {
        const where = { schoolId };

        if (stageId && stageId !== "All") {
            where.currentStageId = stageId;
        }

        if (formId && formId !== "ALL") {
            where.formId = formId;
        }

        const applications = await prisma.application.findMany({
            where,
            orderBy: { submittedAt: "desc" },
            include: {
                form: {
                    select: {
                        title: true,
                        category: true,
                    },
                },
                currentStage: {
                    select: {
                        name: true,
                        order: true,
                    },
                },
            },
        });

        const total = await prisma.application.count({ where });

        return NextResponse.json({ applications, total });
    } catch (error) {
        console.error("Error fetching applications:", error);
        return NextResponse.json(
            { error: "Failed to fetch applications" },
            { status: 500 }
        );
    }
}
