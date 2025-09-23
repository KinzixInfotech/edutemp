import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const moveSchema = z.object({
    id: z.string().uuid(),
    stageId: z.string().uuid(),
    notes: z.string().optional(),
    movedById: z.string().uuid(),
});

export async function POST(req, { params }) {
    const data = await req.json();
    const validated = moveSchema.parse({ ...data, id: params.id });
    try {
        const application = await prisma.application.findUnique({
            where: { id: validated.id },
            select: { currentStageId: true, schoolId: true },
        });
        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }
        const stage = await prisma.stage.findUnique({
            where: { id: validated.stageId },
            select: { schoolId: true },
        });
        if (!stage || stage.schoolId !== application.schoolId) {
            return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
        }
        // Verify movedById
        const user = await prisma.user.findFirst({
            where: { id: validated.movedById, schoolId: application.schoolId },
        });
        if (!user) {
            return NextResponse.json({ error: "User not authorized" }, { status: 403 });
        }
        await prisma.$transaction([
            prisma.application.update({
                where: { id: validated.id },
                data: { currentStageId: validated.stageId },
            }),
            prisma.stageHistory.create({
                data: {
                    applicationId: validated.id,
                    stageId: validated.stageId,
                    movedById: validated.movedById,
                    notes: validated.notes,
                },
            }),
        ]);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}