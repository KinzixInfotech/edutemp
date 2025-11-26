import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Fetch submissions for a form
export async function GET(req, { params }) {
    const { schoolId, formId } = await params;

    try {
        const submissions = await prisma.application.findMany({
            where: {
                schoolId,
                formId,
            },
            orderBy: {
                submittedAt: "desc",
            },
        });

        return NextResponse.json(submissions);
    } catch (error) {
        console.error("Error fetching submissions:", error);
        return NextResponse.json(
            { error: "Failed to fetch submissions" },
            { status: 500 }
        );
    }
}
