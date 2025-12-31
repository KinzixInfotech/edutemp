import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { invalidatePattern } from "@/lib/cache";

/**
 * Clone class teacher assignments from one academic year to another
 * POST /api/schools/academic-years/clone/class-teachers
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

        // Get all sections for this school with their teachers
        const allSections = await prisma.section.findMany({
            where: { schoolId },
            include: {
                class: true,
                teachingStaff: true
            }
        });

        // Count sections with teachers
        const sectionsWithTeachers = allSections.filter(s => s.teachingStaffUserId);

        // Update setup status for the target year
        await prisma.academicYear.update({
            where: { id: toYearId },
            data: { classesConfigured: true },
        });

        // Invalidate classes cache to reflect changes immediately
        await invalidatePattern(`classes:${schoolId}*`);

        console.log("=== END DEBUG ===");

        return NextResponse.json({
            success: true,
            count: sectionsWithTeachers.length,
            totalSections: allSections.length,
            message: sectionsWithTeachers.length > 0
                ? `Found ${sectionsWithTeachers.length} sections with teachers assigned`
                : 'No class teachers assigned yet. Please assign teachers in the Classes page first.',
            sections: allSections.map(s => ({
                class: s.class?.className,
                section: s.name,
                teacher: s.teachingStaff?.name || null,
                teacherId: s.teachingStaffUserId
            }))
        });
    } catch (error) {
        console.error("Clone class teachers error:", error);
        return NextResponse.json(
            { error: "Failed to clone class teacher assignments", details: error.message },
            { status: 500 }
        );
    }
}
