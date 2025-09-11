// app/api/schools/syllabus/route.js
import prisma from "@/lib/prisma";
import { School } from "lucide-react";
import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    if (!schoolId) {
        return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }
    try {
        const syllabi = await prisma.syllabus.findMany({
            where: { schoolId },
            include: {
                Class: true,
                AcademicYear: true,
            },
        });
        return NextResponse.json(syllabi);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch syllabi" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { fileUrl, schoolId, classId } = body;

        if (!fileUrl || !schoolId) {
            return NextResponse.json(
                { error: "fileUrl and schoolId are required" },
                { status: 400 }
            );
        }

        // Fetch active academic year 
        let finalAcademicYearId;

        const activeYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
        });
        if (activeYear) finalAcademicYearId = activeYear.id;

        const syllabus = await prisma.syllabus.create({
            data: {
                fileUrl,
                School: { connect: { id: schoolId } },
                Class: { connect: { id: parseInt(classId) } },
                AcademicYear: { connect: { id: finalAcademicYearId } },
            },
            include: {
                Class: true,
                AcademicYear: true,
                School: true,
            },
        });


        return NextResponse.json(syllabus, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to create syllabus" },
            { status: 500 }
        );
    }
}

export async function DELETE(req) {
    const body = await req.json();
    const { id } = body;
    if (!id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    try {
        await prisma.syllabus.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete syllabus" }, { status: 500 });
    }
}