import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { promotions, fromYearId, toYearId, promotedBy } = body;
    // promotions: [{ studentId, toClassId, toSectionId, status, remarks }]

    // ========== VALIDATION ==========
    if (!promotions || !Array.isArray(promotions) || promotions.length === 0) {
        return NextResponse.json({ error: "No students selected for promotion" }, { status: 400 });
    }
    if (!fromYearId || !toYearId) {
        return NextResponse.json({ error: "Both source and target academic years are required" }, { status: 400 });
    }
    if (!promotedBy) {
        return NextResponse.json({ error: "Promoter ID is required" }, { status: 400 });
    }
    if (fromYearId === toYearId) {
        return NextResponse.json({ error: "Source and target academic years must be different" }, { status: 400 });
    }

    try {
        // Validate year order (source must be before target)
        const [fromYear, toYear] = await Promise.all([
            prisma.academicYear.findUnique({ where: { id: fromYearId } }),
            prisma.academicYear.findUnique({ where: { id: toYearId } })
        ]);

        if (!fromYear || !toYear) {
            return NextResponse.json({ error: "Invalid academic year(s)" }, { status: 400 });
        }

        if (new Date(fromYear.startDate) >= new Date(toYear.startDate)) {
            return NextResponse.json({
                error: "Cannot promote backwards. Source year must be before target year."
            }, { status: 400 });
        }

        // Check for duplicate promotions (students already in target year)
        const studentIds = promotions.map(p => p.studentId);
        const existingPromotions = await prisma.promotionHistory.findMany({
            where: {
                studentId: { in: studentIds },
                toYearId: toYearId,
                isRolledBack: false
            }
        });

        if (existingPromotions.length > 0) {
            const alreadyPromoted = existingPromotions.map(p => p.studentId);
            return NextResponse.json({
                error: `${existingPromotions.length} student(s) have already been promoted to ${toYear.name}`,
                alreadyPromotedIds: alreadyPromoted
            }, { status: 400 });
        }

        // Validate target classes and sections exist (filter out null for Class 12 graduation)
        const targetClassIds = [...new Set(promotions.map(p => p.toClassId).filter(Boolean))];
        const targetSectionIds = [...new Set(promotions.map(p => p.toSectionId).filter(Boolean))];

        const [validClasses, validSections] = await Promise.all([
            targetClassIds.length > 0 ? prisma.class.findMany({ where: { id: { in: targetClassIds }, schoolId } }) : [],
            targetSectionIds.length > 0 ? prisma.section.findMany({ where: { id: { in: targetSectionIds }, schoolId } }) : []
        ]);

        if (validClasses.length !== targetClassIds.length) {
            return NextResponse.json({ error: "One or more target classes are invalid" }, { status: 400 });
        }
        if (validSections.length !== targetSectionIds.length) {
            return NextResponse.json({ error: "One or more target sections are invalid" }, { status: 400 });
        }

        // ========== EXECUTE PROMOTION ==========
        const batchId = crypto.randomUUID(); // Group this batch of promotions

        const results = await prisma.$transaction(async (tx) => {
            const updates = [];
            const errors = [];

            for (const promo of promotions) {
                const { studentId, toClassId, toSectionId, status, remarks } = promo;

                if (!toSectionId) {
                    errors.push({ studentId, error: "Target section is required" });
                    continue;
                }

                const currentStudent = await tx.student.findUnique({
                    where: { userId: studentId },
                    select: {
                        classId: true,
                        sectionId: true,
                        academicYearId: true,
                        name: true
                    }
                });

                if (!currentStudent) {
                    errors.push({ studentId, error: "Student not found" });
                    continue;
                }

                // Create Promotion History
                await tx.promotionHistory.create({
                    data: {
                        studentId,
                        fromClassId: currentStudent.classId,
                        toClassId: toClassId,
                        fromSectionId: currentStudent.sectionId,
                        toSectionId: toSectionId,
                        fromYearId: fromYearId, // Use the passed fromYearId instead of potentially null academicYearId
                        toYearId: toYearId,
                        status,
                        remarks: remarks || null,
                        promotedBy,
                        batchId
                    }
                });

                // Handle different statuses
                let updateData = {};

                // Get source and target class details
                const sourceClass = await tx.class.findUnique({ where: { id: currentStudent.classId } });
                const targetClass = validClasses.find(c => c.id === toClassId);

                // Check if source is Class 12 (graduation case)
                const isClass12 = sourceClass?.className === "12" || sourceClass?.className === "XII";
                const targetClassName = targetClass?.className || "";
                const isTargetClass13 = targetClassName === "13" || targetClassName === "XIII" || parseInt(targetClassName) > 12;

                // Block promotion from Class 12 to Class 13+
                if (isClass12 && status === "PROMOTED" && isTargetClass13) {
                    errors.push({
                        studentId,
                        name: currentStudent.name,
                        error: "Class 12 students cannot be promoted to Class 13. Use 'Graduate' instead."
                    });
                    continue;
                }

                // Handle GRADUATE status (Class 12 → Alumni)
                if (status === "GRADUATE") {
                    // Create Alumni record
                    await tx.alumni.create({
                        data: {
                            schoolId,
                            originalStudentId: studentId,
                            admissionNo: currentStudent.admissionNo || "",
                            name: currentStudent.name,
                            email: currentStudent.email || "",
                            contactNumber: currentStudent.contactNumber || "",
                            lastClassId: currentStudent.classId,
                            lastSectionId: currentStudent.sectionId,
                            lastAcademicYear: fromYearId,
                            graduationYear: new Date().getFullYear(),
                            leavingDate: new Date(),
                            leavingReason: "GRADUATED"
                        }
                    });

                    // Mark student as alumni
                    updateData = {
                        academicYearId: toYearId,
                        isAlumni: true,
                        alumniConvertedAt: new Date(),
                        DateOfLeaving: new Date()
                    };
                } else if (status === "PROMOTED" || status === "CONDITIONAL") {
                    // Normal promotion - move to new class/section/year
                    updateData = {
                        academicYearId: toYearId,
                        classId: toClassId,
                        sectionId: toSectionId
                    };
                } else if (status === "DETAINED") {
                    // Keep same class but update year (they repeat the class)
                    updateData = {
                        academicYearId: toYearId
                        // classId and sectionId stay the same
                    };
                }

                // Update Student
                const updatedStudent = await tx.student.update({
                    where: { userId: studentId },
                    data: updateData
                });

                updates.push({
                    studentId,
                    name: currentStudent.name,
                    status,
                    isGraduated: isGraduation && status === "PROMOTED"
                });
            }

            if (errors.length > 0 && updates.length === 0) {
                throw new Error(JSON.stringify({ errors }));
            }

            return { updates, errors };
        });

        // Summary
        const summary = {
            total: promotions.length,
            promoted: results.updates.filter(u => u.status === "PROMOTED").length,
            detained: results.updates.filter(u => u.status === "DETAINED").length,
            conditional: results.updates.filter(u => u.status === "CONDITIONAL").length,
            graduated: results.updates.filter(u => u.isGraduated).length,
            errors: results.errors.length
        };

        return NextResponse.json({
            message: "Promotions processed successfully",
            count: results.updates.length,
            summary,
            batchId,
            errors: results.errors.length > 0 ? results.errors : undefined
        });

    } catch (error) {
        console.error("Error executing promotions:", error);

        // Try to parse structured error
        try {
            const parsed = JSON.parse(error.message);
            if (parsed.errors) {
                return NextResponse.json({
                    error: "Some promotions failed",
                    details: parsed.errors
                }, { status: 400 });
            }
        } catch { }

        return NextResponse.json({
            error: error.message || "Internal Server Error"
        }, { status: 500 });
    }
}
