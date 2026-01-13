import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/schools/[schoolId]/forms/[formId]/submissions/[submissionId]
export async function GET(req, { params }) {
    const { schoolId, formId, submissionId } = await params;

    if (!schoolId || !formId || !submissionId) {
        return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    try {
        // Fetch submission with form details including fields
        const submission = await prisma.application.findFirst({
            where: {
                id: submissionId,
                formId,
                schoolId
            },
            include: {
                form: {
                    include: {
                        fields: {
                            orderBy: { order: 'asc' }
                        }
                    }
                }
            }
        });

        if (!submission) {
            return NextResponse.json({ error: "Submission not found" }, { status: 404 });
        }

        // Parse data if it's a string
        const parsedData = typeof submission.data === 'string'
            ? JSON.parse(submission.data)
            : submission.data;

        return NextResponse.json({
            id: submission.id,
            applicantName: submission.applicantName,
            applicantEmail: submission.applicantEmail,
            submittedAt: submission.submittedAt, // Use the actual submittedAt field
            data: parsedData,
            formId: submission.formId,
            schoolId: submission.schoolId,
            form: {
                title: submission.form.title,
                description: submission.form.description,
                fields: submission.form.fields // Include form structure
            }
        });
    } catch (error) {
        console.error("Error fetching submission:", error);
        return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500 });
    }
}
