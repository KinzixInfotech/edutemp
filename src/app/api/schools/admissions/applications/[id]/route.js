import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const idSchema = z.object({
    id: z.string().uuid(),
});

export async function GET(req, { params }) {
    const validated = idSchema.parse(params);
    try {
        const application = await prisma.application.findUnique({
            where: { id: validated.id },
            select: {
                id: true,
                applicantName: true,
                applicantEmail: true,
                data: true,
                submittedAt: true,
                currentStage: { select: { name: true } },
                documents: true,
                stageHistory: {
                    select: {
                        stage: { select: { name: true } },
                        movedAt: true,
                        notes: true,
                        movedBy: { select: { name: true } },
                    },
                    orderBy: { movedAt: "asc" },
                },
            },
        });
        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, application });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}