import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Temporary debug/revert endpoint — DELETE after use
export async function GET(req, { params }) {
    const { schoolId } = await params;

    try {
        // Get all academic years
        const years = await prisma.academicYear.findMany({
            where: { schoolId },
            orderBy: { startDate: 'asc' },
        });

        // Check class distribution
        const classes = await prisma.class.findMany({
            where: { schoolId },
            select: { id: true, className: true, academicYearId: true },
        });

        const classDistribution = {};
        classes.forEach(c => {
            const key = c.academicYearId || 'NULL';
            if (!classDistribution[key]) classDistribution[key] = [];
            classDistribution[key].push(c.className);
        });

        // Check student distribution
        const studentCountByYear = {};
        for (const y of years) {
            const count = await prisma.student.count({
                where: { schoolId, academicYearId: y.id },
            });
            studentCountByYear[y.name] = count;
        }
        const nullStudents = await prisma.student.count({
            where: { schoolId, academicYearId: null },
        });
        studentCountByYear['NULL'] = nullStudents;

        return NextResponse.json({
            years: years.map(y => ({
                id: y.id,
                name: y.name,
                isActive: y.isActive,
                setupComplete: y.setupComplete,
                startDate: y.startDate,
                endDate: y.endDate,
            })),
            classDistribution,
            studentCountByYear,
            totalClasses: classes.length,
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST to revert: make 2025-26 active, 2026-27 inactive, clean up cloned data
export async function POST(req, { params }) {
    const { schoolId } = await params;

    try {
        const years = await prisma.academicYear.findMany({
            where: { schoolId },
            orderBy: { startDate: 'asc' },
        });

        const year2025 = years.find(y => y.name.includes('2025'));
        const year2026 = years.find(y => y.name.includes('2026'));

        if (!year2025 || !year2026) {
            return NextResponse.json({ error: "Could not find both years" }, { status: 404 });
        }

        // Revert active status
        await prisma.academicYear.update({
            where: { id: year2025.id },
            data: { isActive: true },
        });
        await prisma.academicYear.update({
            where: { id: year2026.id },
            data: { isActive: false, setupComplete: false },
        });

        // Delete cloned classes bound to 2026-27
        const clonedClasses = await prisma.class.findMany({
            where: { schoolId, academicYearId: year2026.id },
        });

        let deletedSections = 0;
        let deletedClasses = 0;

        if (clonedClasses.length > 0) {
            const clonedIds = clonedClasses.map(c => c.id);

            // Delete subjects tied to cloned classes
            await prisma.subject.deleteMany({
                where: { classId: { in: clonedIds } },
            });

            // Delete sections
            const secResult = await prisma.section.deleteMany({
                where: { classId: { in: clonedIds } },
            });
            deletedSections = secResult.count;

            // Delete classes
            const clsResult = await prisma.class.deleteMany({
                where: { id: { in: clonedIds } },
            });
            deletedClasses = clsResult.count;
        }

        // Revert any students that were moved to 2026-27
        const movedStudents = await prisma.student.updateMany({
            where: { schoolId, academicYearId: year2026.id },
            data: { academicYearId: year2025.id },
        });

        return NextResponse.json({
            success: true,
            reverted: {
                activeYear: year2025.name,
                inactiveYear: year2026.name,
                deletedClasses,
                deletedSections,
                movedStudentsBack: movedStudents.count,
            },
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
