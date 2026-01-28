import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Fetch student activity records
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { studentId, activityId, categoryId, academicYearId, termNumber } = searchParams;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const whereClause = {
            student: { schoolId },
            ...(studentId && { studentId }),
            ...(activityId && { activityId }),
            ...(categoryId && { activity: { categoryId } }),
            ...(academicYearId && { academicYearId }),
            ...(termNumber && { termNumber: Number(termNumber) })
        };

        const records = await prisma.studentActivityRecord.findMany({
            where: whereClause,
            include: {
                activity: {
                    include: { category: { select: { name: true, icon: true } } }
                },
                student: { select: { name: true, rollNumber: true } },
                recordedBy: { select: { name: true } },
                academicYear: { select: { name: true } }
            },
            orderBy: { recordedAt: "desc" }
        });

        return NextResponse.json({ records });
    } catch (err) {
        console.error("Error fetching activity records:", err);
        return NextResponse.json(
            { error: "Failed to fetch records", message: err.message },
            { status: 500 }
        );
    }
}

// POST - Record student activity participation
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { records, recordedById } = body;

    if (!schoolId || !records || !Array.isArray(records) || !recordedById) {
        return NextResponse.json(
            { error: "schoolId, records array, and recordedById are required" },
            { status: 400 }
        );
    }

    try {
        const results = await prisma.$transaction(
            records.map(record =>
                prisma.studentActivityRecord.upsert({
                    where: {
                        studentId_activityId_academicYearId_termNumber: {
                            studentId: record.studentId,
                            activityId: record.activityId,
                            academicYearId: record.academicYearId,
                            termNumber: record.termNumber
                        }
                    },
                    update: {
                        participationRating: record.participationRating || 0,
                        consistencyRating: record.consistencyRating || 0,
                        attitudeRating: record.attitudeRating || 0,
                        remarks: record.remarks || null,
                        achievements: record.achievements || null,
                        recordedById,
                        recordedAt: new Date()
                    },
                    create: {
                        studentId: record.studentId,
                        activityId: record.activityId,
                        academicYearId: record.academicYearId,
                        termNumber: record.termNumber,
                        participationRating: record.participationRating || 0,
                        consistencyRating: record.consistencyRating || 0,
                        attitudeRating: record.attitudeRating || 0,
                        remarks: record.remarks || null,
                        achievements: record.achievements || null,
                        recordedById
                    }
                })
            )
        );

        return NextResponse.json({
            message: "Activity records saved successfully",
            count: results.length
        });
    } catch (err) {
        console.error("Error recording activities:", err);
        return NextResponse.json(
            { error: "Failed to record activities", message: err.message },
            { status: 500 }
        );
    }
}
