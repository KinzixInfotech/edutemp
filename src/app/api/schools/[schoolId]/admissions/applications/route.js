import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Helper function to check if a string is a valid UUID
function isUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

// GET: Fetch applications
export async function GET(req, { params }) {
    const { schoolId } = await params;
    const { searchParams } = new URL(req.url);
    const stageIdParam = searchParams.get("stageId");
    const formId = searchParams.get("formId");

    try {
        const where = { schoolId };

        // Handle stageId - support both UUID and stage name
        if (stageIdParam && stageIdParam !== "All") {
            let actualStageId = stageIdParam;

            // If not a UUID, treat it as a stage name and look it up
            if (!isUUID(stageIdParam)) {
                const stage = await prisma.stage.findFirst({
                    where: {
                        schoolId: schoolId,
                        name: stageIdParam
                    },
                    select: { id: true }
                });

                if (!stage) {
                    return NextResponse.json(
                        { error: `Stage "${stageIdParam}" not found for this school` },
                        { status: 404 }
                    );
                }

                actualStageId = stage.id;
            }

            where.currentStageId = actualStageId;
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

        // For enrolled applications, fetch student details if they exist
        let applicationsWithStudents = applications;
        if (stageIdParam && (stageIdParam === "Enrolled" || !isUUID(stageIdParam))) {
            applicationsWithStudents = await Promise.all(
                applications.map(async (app) => {
                    const student = await prisma.student.findFirst({
                        where: {
                            email: app.applicantEmail,
                            schoolId: schoolId
                        },
                        include: {
                            class: { select: { className: true } },
                            section: { select: { name: true } }
                        }
                    });

                    return {
                        ...app,
                        studentDetails: student ? {
                            admissionNo: student.admissionNo,
                            admissionDate: student.admissionDate,
                            className: student.class?.className,
                            sectionName: student.section?.name,
                            rollNumber: student.rollNumber
                        } : null
                    };
                })
            );
        }

        const total = await prisma.application.count({ where });

        return NextResponse.json({ applications: applicationsWithStudents, total });
    } catch (error) {
        console.error("Error fetching applications:", error);
        return NextResponse.json(
            { error: "Failed to fetch applications" },
            { status: 500 }
        );
    }
}
