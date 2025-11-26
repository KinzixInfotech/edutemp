import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST: Submit a form
export async function POST(req, { params }) {
    const { formId } = await params;

    try {
        const body = await req.json();
        const { data, applicantName, applicantEmail } = body;

        // Fetch form to check settings and fields
        const form = await prisma.form.findUnique({
            where: { id: formId },
            include: { school: true }
        });

        if (!form) {
            return NextResponse.json({ error: "Form not found" }, { status: 404 });
        }

        if (form.status !== "PUBLISHED") {
            return NextResponse.json({ error: "This form is not currently accepting submissions." }, { status: 403 });
        }

        // Check if multiple submissions are allowed
        // Note: settings is Json, so we need to cast or check safely
        const settings = form.settings || {};
        if (!settings.allowMultiple) {
            const existingSubmission = await prisma.application.findFirst({
                where: {
                    formId,
                    applicantEmail,
                },
            });

            if (existingSubmission) {
                return NextResponse.json(
                    { error: "You have already submitted this form." },
                    { status: 400 }
                );
            }
        }

        // Create submission (Application)
        const submission = await prisma.application.create({
            data: {
                schoolId: form.schoolId,
                formId,
                applicantName,
                applicantEmail,
                data,
                // If it's an admission form, we might want to set a default stage
                // But for now, we leave currentStageId null or handle it if we fetch stages
            },
        });

        // If it's an admission form, assign default stage (Order 1)
        if (form.category === "ADMISSION") {
            const firstStage = await prisma.stage.findFirst({
                where: { schoolId: form.schoolId },
                orderBy: { order: "asc" },
            });

            if (firstStage) {
                await prisma.application.update({
                    where: { id: submission.id },
                    data: { currentStageId: firstStage.id },
                });

                // Add to history
                await prisma.stageHistory.create({
                    data: {
                        applicationId: submission.id,
                        stageId: firstStage.id,
                        notes: "Initial submission"
                    }
                });
            }
        }

        return NextResponse.json({ message: "Form submitted successfully", id: submission.id });
    } catch (error) {
        console.error("Error submitting form:", error);
        return NextResponse.json(
            { error: "Failed to submit form" },
            { status: 500 }
        );
    }
}

// GET: Fetch public form details
export async function GET(req, { params }) {
    const { formId } = await params;

    try {
        const form = await prisma.form.findUnique({
            where: { id: formId },
            include: {
                fields: {
                    orderBy: { order: "asc" }
                }
            }
        });

        if (!form) {
            return NextResponse.json({ error: "Form not found" }, { status: 404 });
        }

        if (form.status !== "PUBLISHED") {
            // Allow viewing if it's the owner (we can't easily check auth here without session, 
            // but usually public view is strict. For preview, we might need a separate param or auth check)
            // For now, return 403 unless it's a draft preview (maybe handled by frontend)
            // But let's return data with a warning flag if needed, or just 403.
            // Actually, for Preview in Builder, we might need to fetch this even if DRAFT.
            // Let's allow fetching, but frontend should handle display.
            // Or better, check query param ?preview=true but that's insecure.
            // Let's just return it, but submission will fail.
        }

        // Hide sensitive settings
        const { settings, ...publicForm } = form;
        // We might want to expose some settings like allowMultiple

        return NextResponse.json({
            ...publicForm,
            isAccepting: form.status === "PUBLISHED"
        });

    } catch (error) {
        console.error("Error fetching form:", error);
        return NextResponse.json({ error: "Failed to fetch form" }, { status: 500 });
    }
}
