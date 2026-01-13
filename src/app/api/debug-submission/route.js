import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/debug-submission?submissionId=xxx
// Temporary debug endpoint to inspect submission data structure
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get("submissionId");
    const formId = searchParams.get("formId");

    if (!submissionId && !formId) {
        return NextResponse.json({ error: "submissionId or formId is required" }, { status: 400 });
    }

    try {
        const debug = {};

        if (submissionId) {
            // Get specific submission
            const submission = await prisma.application.findUnique({
                where: { id: submissionId },
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

            if (submission) {
                debug.submission = {
                    id: submission.id,
                    applicantName: submission.applicantName,
                    applicantEmail: submission.applicantEmail,
                    submittedAt: submission.submittedAt,
                    rawData: submission.data,
                    dataType: typeof submission.data,
                    dataKeys: submission.data ? Object.keys(submission.data) : []
                };

                debug.formFields = submission.form?.fields?.map(f => ({
                    id: f.id,
                    name: f.name,
                    label: f.label,
                    type: f.type,
                    order: f.order
                }));

                // Check key matching
                debug.keyAnalysis = {
                    dataKeys: Object.keys(submission.data || {}),
                    fieldLabels: submission.form?.fields?.map(f => f.label) || [],
                    fieldIds: submission.form?.fields?.map(f => f.id) || [],
                    matchingByLabel: {},
                    matchingById: {}
                };

                // Check what matches
                for (const key of Object.keys(submission.data || {})) {
                    debug.keyAnalysis.matchingByLabel[key] = submission.form?.fields?.find(f => f.label === key) ? true : false;
                    debug.keyAnalysis.matchingById[key] = submission.form?.fields?.find(f => f.id === key) ? true : false;
                }
            }
        }

        if (formId) {
            // Get all submissions for a form
            const submissions = await prisma.application.findMany({
                where: { formId },
                take: 3,
                orderBy: { submittedAt: 'desc' }
            });

            debug.sampleSubmissions = submissions.map(s => ({
                id: s.id,
                dataKeys: s.data ? Object.keys(s.data) : [],
                sampleData: s.data
            }));
        }

        return NextResponse.json(debug);

    } catch (error) {
        console.error("Debug error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
