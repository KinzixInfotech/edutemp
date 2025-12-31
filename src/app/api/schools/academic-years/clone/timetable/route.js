import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Clone timetable templates from one academic year to another
 * POST /api/schools/academic-years/clone/timetable
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

        // Get all timetable templates from source year with slots
        const sourceTemplates = await prisma.timetableTemplate.findMany({
            where: { academicYearId: fromYearId },
            include: {
                slots: true,
                class: true,
                section: true,
            },
        });

        if (sourceTemplates.length === 0) {
            return NextResponse.json(
                { error: "No timetable templates found in source year to clone" },
                { status: 404 }
            );
        }

        // Get classes and sections in target year to map old ones to new
        const targetClasses = await prisma.class.findMany({
            where: { academicYearId: toYearId },
            include: { sections: true },
        });
        const classNameToId = new Map(targetClasses.map(c => [c.className, c.id]));
        const sectionMap = new Map();
        targetClasses.forEach(c => {
            c.sections.forEach(s => {
                sectionMap.set(`${c.className}-${s.sectionName}`, s.id);
            });
        });

        // Check what already exists in target year
        const existingTemplates = await prisma.timetableTemplate.findMany({
            where: { academicYearId: toYearId },
            select: { classId: true, sectionId: true },
        });
        const existingKeys = new Set(existingTemplates.map(t => `${t.classId}-${t.sectionId}`));

        // Clone templates that don't exist
        let clonedCount = 0;
        for (const template of sourceTemplates) {
            if (!template.class) continue;

            // Find matching class in target year
            const targetClassId = classNameToId.get(template.class.className);
            if (!targetClassId) continue;

            // Find matching section if applicable
            let targetSectionId = null;
            if (template.section) {
                const sectionKey = `${template.class.className}-${template.section.sectionName}`;
                targetSectionId = sectionMap.get(sectionKey);
                if (!targetSectionId) continue;
            }

            const key = `${targetClassId}-${targetSectionId}`;
            if (existingKeys.has(key)) continue;

            // Create template
            const newTemplate = await prisma.timetableTemplate.create({
                data: {
                    name: template.name,
                    classId: targetClassId,
                    sectionId: targetSectionId,
                    academicYearId: toYearId,
                },
            });

            // Create slots for this template
            if (template.slots?.length > 0) {
                await prisma.timetableSlot.createMany({
                    data: template.slots.map(slot => ({
                        dayOfWeek: slot.dayOfWeek,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        subjectId: slot.subjectId,
                        teacherId: slot.teacherId,
                        templateId: newTemplate.id,
                        slotType: slot.slotType,
                    })),
                });
            }

            clonedCount++;
        }

        // Update setup status
        await prisma.academicYear.update({
            where: { id: toYearId },
            data: { timetableConfigured: true },
        });

        return NextResponse.json({
            success: true,
            count: clonedCount,
            message: `Cloned ${clonedCount} timetable templates with slots`,
        });
    } catch (error) {
        console.error("Clone timetable error:", error);
        return NextResponse.json(
            { error: "Failed to clone timetable" },
            { status: 500 }
        );
    }
}
