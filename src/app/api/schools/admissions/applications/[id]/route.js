import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Fetch single application by ID
export async function GET(req, props) {
  const params = await props.params;
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");

    try {
        const application = await prisma.application.findUnique({
            where: { id },
            include: {
                form: {
                    select: {
                        title: true,
                        category: true,
                    },
                },
                currentStage: {
                    select: {
                        id: true,
                        name: true,
                        order: true,
                    },
                },
                stageHistory: {
                    include: {
                        stage: {
                            select: {
                                name: true,
                            },
                        },
                    },
                    orderBy: {
                        movedAt: "desc",
                    },
                },
            },
        });

        if (!application) {
            return NextResponse.json(
                { error: "Application not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ application });
    } catch (error) {
        console.error("Error fetching application:", error);
        return NextResponse.json(
            { error: "Failed to fetch application" },
            { status: 500 }
        );
    }
}
