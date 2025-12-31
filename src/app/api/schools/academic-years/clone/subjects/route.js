import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Clone subject mappings from one academic year to another
 * POST /api/schools/academic-years/clone/subjects
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { fromYearId, toYearId, schoolId } = body;

        if (!fromYearId || !toYearId || !schoolId) {
            return NextResponse.json(
                { error: "fromYearId, toYearId, and schoolId are required" },
                { status: 400 }
            );
        }

        // Verify both years belong to the same school
        const [fromYear, toYear] = await Promise.all([
            prisma.academicYear.findFirst({ where: { id: fromYearId, schoolId } }),
            prisma.academicYear.findFirst({ where: { id: toYearId, schoolId } }),
        ]);

        if (!fromYear || !toYear) {
            return NextResponse.json(
                { error: "Invalid academic years or school mismatch" },
                { status: 400 }
            );
        }

        // Get all syllabus entries (subject mappings) from source year
        const sourceSyllabus = await prisma.syllabus.findMany({
            where: { academicYearId: fromYearId },
            include: {
                subject: true,
                class: true
            },
        });

        if (sourceSyllabus.length === 0) {
            return NextResponse.json(
                { error: "No subject mappings found in source year to clone" },
                { status: 404 }
            );
        }

        // Get classes in target year to map old classes to new ones
        const targetClasses = await prisma.class.findMany({
            where: { academicYearId: toYearId },
        });
        const classNameToId = new Map(targetClasses.map(c => [c.className, c.id]));

        // Check what already exists in target year
        const existingSyllabus = await prisma.syllabus.findMany({
            where: { academicYearId: toYearId },
            select: { subjectId: true, classId: true },
        });
        const existingKeys = new Set(existingSyllabus.map(s => `${s.subjectId}-${s.classId}`));

        // Clone only entries that don't exist
        let clonedCount = 0;
        for (const entry of sourceSyllabus) {
            if (!entry.class) continue;

            // Find matching class in target year
            const targetClassId = classNameToId.get(entry.class.className);
            if (!targetClassId) continue; // Skip if class doesn't exist in target

            const key = `${entry.subjectId}-${targetClassId}`;
            if (existingKeys.has(key)) continue;

            await prisma.syllabus.create({
                data: {
                    subjectId: entry.subjectId,
                    classId: targetClassId,
                    academicYearId: toYearId,
                    teacherId: entry.teacherId, // Keep same teacher if applicable
                },
            });

            clonedCount++;
        }

        // Update setup status
        await prisma.academicYear.update({
            where: { id: toYearId },
            data: { subjectsConfigured: true },
        });

        return NextResponse.json({
            success: true,
            count: clonedCount,
            message: `Cloned ${clonedCount} subject mappings`,
        });
    } catch (error) {
        console.error("Clone subjects error:", error);
        return NextResponse.json(
            { error: "Failed to clone subject mappings" },
            { status: 500 }
        );
    }
}
