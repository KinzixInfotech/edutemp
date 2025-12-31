import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Clone classes and sections from one academic year to another
 * POST /api/schools/academic-years/clone/classes
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

        // Get all classes from source year with their sections
        const sourceClasses = await prisma.class.findMany({
            where: { academicYearId: fromYearId },
            include: { sections: true },
        });

        if (sourceClasses.length === 0) {
            return NextResponse.json(
                { error: "No classes found in source year to clone" },
                { status: 404 }
            );
        }

        // Check what already exists in target year
        const existingClasses = await prisma.class.findMany({
            where: { academicYearId: toYearId },
            select: { className: true },
        });
        const existingNames = new Set(existingClasses.map(c => c.className));

        // Clone only classes that don't exist
        let clonedCount = 0;
        for (const cls of sourceClasses) {
            if (existingNames.has(cls.className)) continue;

            // Create class
            const newClass = await prisma.class.create({
                data: {
                    className: cls.className,
                    academicYearId: toYearId,
                    schoolId: schoolId,
                },
            });

            // Create sections for this class
            if (cls.sections?.length > 0) {
                await prisma.section.createMany({
                    data: cls.sections.map(sec => ({
                        sectionName: sec.sectionName,
                        classId: newClass.id,
                    })),
                });
            }

            clonedCount++;
        }

        // Update setup status
        await prisma.academicYear.update({
            where: { id: toYearId },
            data: { classesConfigured: true },
        });

        return NextResponse.json({
            success: true,
            count: clonedCount,
            message: `Cloned ${clonedCount} classes with sections`,
        });
    } catch (error) {
        console.error("Clone classes error:", error);
        return NextResponse.json(
            { error: "Failed to clone classes" },
            { status: 500 }
        );
    }
}
