import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const applicationSchema = z.object({
    admissionFormId: z.string().uuid(),
    schoolId: z.string().uuid(),
    applicantName: z.string().min(1),
    applicantEmail: z.string().email(),
    createdById: z.string().uuid().optional(), // From authenticated user
    data: z.object({}),
    documents: z.array(z.object({
        fileUrl: z.string().url(),
        fileName: z.string(),
        mimeType: z.string(),
        size: z.number(),
    })).optional(),
});

export async function POST(req) {
    try {
        const data = await req.json();
        console.log(data);
        const validated = applicationSchema.parse(data);
        console.log(validated);

        // Verify user if createdById is provided
        if (validated.createdById) {
            const user = await prisma.user.findFirst({
                where: { id: validated.createdById, schoolId: validated.schoolId },
            });
            if (!user) {
                return NextResponse.json({ error: "User not found in the specified school" }, { status: 404 });
            }
        }

        // Verify form
        const form = await prisma.admissionForm.findUnique({
            where: { id: validated.admissionFormId },
            select: { schoolId: true },
        });
        if (!form || form.schoolId !== validated.schoolId) {
            return NextResponse.json({ error: "Invalid form" }, { status: 400 });
        }

        // Get default stage
        const defaultStage = await prisma.stage.findFirst({
            where: { schoolId: validated.schoolId, order: 1 },
            select: { id: true },
        });
        if (!defaultStage) {
            return NextResponse.json({ error: "No stages configured" }, { status: 400 });
        }

        // Create application and stage history
        const application = await prisma.application.create({
            data: {
                admissionFormId: validated.admissionFormId,
                schoolId: validated.schoolId,
                applicantName: validated.applicantName,
                applicantEmail: validated.applicantEmail,
                data: validated.data,
                currentStageId: defaultStage.id,
                createdById: validated.createdById || null,
                documents: {
                    create: validated.documents || [],
                },
            },
            select: {
                id: true,
                applicantName: true,
                applicantEmail: true,
                submittedAt: true,
                data: true,
                documents: true,
            },
        });

        await prisma.stageHistory.create({
            data: {
                applicationId: application.id,
                stageId: defaultStage.id,
                movedById: validated.createdById || null, // Use authenticated user or null
                notes: "Initial submission",
            },
        });

        return NextResponse.json({ success: true, application });
    } catch (err) {
        console.error(err);
        if (err.name === "ZodError") {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

const getSchema = z.object({
    schoolId: z.string().uuid(),
    stageId: z.string().uuid().optional().nullable(),
    formId: z.string().uuid().optional().nullable(),
    page: z.number().optional().default(1),
    limit: z.number().optional().default(10),
});

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const params = {
        schoolId: searchParams.get("schoolId"),
        stageId: searchParams.get("stageId"),
        formId: searchParams.get("formId"),
        page: parseInt(searchParams.get("page")) || 1,
        limit: parseInt(searchParams.get("limit")) || 10,
    };
    const validated = getSchema.parse(params);
    const skip = (validated.page - 1) * validated.limit;
    try {
        // Assume auth check done in middleware or similar, as in your example
        const where = { schoolId: validated.schoolId };
        if (validated.stageId) where.currentStageId = validated.stageId;
        if (validated.formId) where.admissionFormId = validated.formId;
        const [applications, total] = await Promise.all([
            prisma.application.findMany({
                where,
                select: {
                    id: true,
                    applicantName: true,
                    applicantEmail: true,
                    submittedAt: true,
                    currentStage: { select: { name: true } },
                },
                skip,
                take: validated.limit,
                orderBy: { submittedAt: "desc" },
            }),
            prisma.application.count({ where }),
        ]);
        return NextResponse.json({ success: true, applications, total });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}