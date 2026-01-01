import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Clone subjects and teacher mappings from one academic year to another.
 * This clones:
 * 1. Subjects (Subject model) - linked to classes
 * 2. Teacher Assignments (SectionSubjectTeacher model) - linked to sections & subjects
 * 
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

        console.log("Starting Subject Clone:", { from: fromYear.name, to: toYear.name });

        // 1. Fetch Classes for both years to map them
        const [sourceClasses, targetClasses] = await Promise.all([
            prisma.class.findMany({ where: { academicYearId: fromYearId, schoolId } }),
            prisma.class.findMany({ where: { academicYearId: toYearId, schoolId } })
        ]);

        const targetClassMap = new Map(); // ClassName -> TargetClassId
        targetClasses.forEach(c => targetClassMap.set(c.className, c.id));

        // 2. Fetch Sections for both years to map them
        // We need to fetch all sections for these classes
        const [sourceSections, targetSections] = await Promise.all([
            prisma.section.findMany({
                where: { classId: { in: sourceClasses.map(c => c.id) } },
                include: { class: true }
            }),
            prisma.section.findMany({
                where: { classId: { in: targetClasses.map(c => c.id) } },
                include: { class: true }
            })
        ]);

        const targetSectionMap = new Map(); // SourceSectionId -> TargetSectionId
        sourceSections.forEach(s => {
            const targetClassId = targetClassMap.get(s.class.className);
            // Only map if class exists in target
            if (targetClassId) {
                // Find section in target class with same name
                const targetSection = targetSections.find(ts =>
                    ts.classId === targetClassId && ts.name === s.name
                );
                if (targetSection) {
                    targetSectionMap.set(s.id, targetSection.id);
                }
            }
        });

        // 3. Clone Subjects (Subject model)
        const sourceSubjects = await prisma.subject.findMany({
            where: { classId: { in: sourceClasses.map(c => c.id) } }
        });

        if (sourceSubjects.length === 0) {
            return NextResponse.json(
                { error: "No subjects found in source year to clone" },
                { status: 404 }
            );
        }

        const subjectMap = new Map(); // SourceSubjectId -> TargetSubjectId
        let clonedSubjectsCount = 0;

        for (const sub of sourceSubjects) {
            const sourceClass = sourceClasses.find(c => c.id === sub.classId);
            const targetClassId = targetClassMap.get(sourceClass?.className);

            if (!targetClassId) continue;

            // Check if subject already exists in target class
            const existingSubject = await prisma.subject.findFirst({
                where: {
                    classId: targetClassId,
                    subjectName: sub.subjectName
                }
            });

            if (existingSubject) {
                subjectMap.set(sub.id, existingSubject.id);
                continue;
            }

            // Create new subject
            try {
                const newSubject = await prisma.subject.create({
                    data: {
                        subjectName: sub.subjectName,
                        subjectCode: sub.subjectCode,
                        classId: targetClassId,
                        departmentId: sub.departmentId, // Departments are global
                    }
                });
                subjectMap.set(sub.id, newSubject.id);
                clonedSubjectsCount++;
            } catch (err) {
                console.error(`Failed to clone subject ${sub.subjectName}:`, err);
            }
        }

        // 4. Clone Teacher Assignments (SectionSubjectTeacher) - ONLY IF REQUESTED
        let clonedAssignmentsCount = 0;

        if (body.includeTeachers) {
            const sourceAssignments = await prisma.sectionSubjectTeacher.findMany({
                where: {
                    sectionId: { in: sourceSections.map(s => s.id) }
                }
            });

            for (const assign of sourceAssignments) {
                const targetSectionId = targetSectionMap.get(assign.sectionId);
                const targetSubjectId = subjectMap.get(assign.subjectId);

                if (!targetSectionId || !targetSubjectId) continue;

                // Check if assignment exists
                const existingAssign = await prisma.sectionSubjectTeacher.findFirst({
                    where: {
                        sectionId: targetSectionId,
                        subjectId: targetSubjectId
                    }
                });

                if (existingAssign) continue;

                try {
                    await prisma.sectionSubjectTeacher.create({
                        data: {
                            sectionId: targetSectionId,
                            subjectId: targetSubjectId,
                            teachingStaffUserId: assign.teachingStaffUserId
                        }
                    });
                    clonedAssignmentsCount++;
                } catch (err) {
                    console.error("Failed to clone teacher assignment:", err);
                }
            }
        }

        // Update setup status
        await prisma.academicYear.update({
            where: { id: toYearId },
            data: { subjectsConfigured: true },
        });

        return NextResponse.json({
            success: true,
            subjectsCloned: clonedSubjectsCount,
            assignmentsCloned: clonedAssignmentsCount,
            message: `Cloned ${clonedSubjectsCount} subjects and ${clonedAssignmentsCount} teacher assignments`
        });
    } catch (error) {
        console.error("Clone subjects error:", error);
        return NextResponse.json(
            { error: "Failed to clone subjects: " + error.message },
            { status: 500 }
        );
    }
}
