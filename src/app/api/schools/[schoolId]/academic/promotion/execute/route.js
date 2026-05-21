import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const PROMOTION_STATUSES = new Set(["PROMOTED", "CONDITIONAL", "DETAINED", "GRADUATE"]);

function normalizePromotion(promo) {
  return {
    studentId: promo.studentId,
    enrollmentId: promo.enrollmentId || null,
    toClassId: promo.toClassId ? Number(promo.toClassId) : null,
    toSectionId: promo.toSectionId ? Number(promo.toSectionId) : null,
    status: String(promo.status || "PROMOTED").toUpperCase(),
    remarks: promo.remarks?.trim() || null,
  };
}

function getTargetForPromotion({ promo, sourceEnrollment }) {
  if (promo.status === "GRADUATE") {
    return {
      classId: sourceEnrollment.classId,
      sectionId: sourceEnrollment.sectionId,
      createEnrollment: false,
      enrollmentStatus: "COMPLETED",
      sourceSessionStatus: "ALUMNI",
      promotionType: "GRADUATE",
    };
  }

  if (promo.status === "DETAINED") {
    return {
      classId: sourceEnrollment.classId,
      sectionId: promo.toSectionId || sourceEnrollment.sectionId,
      createEnrollment: true,
      enrollmentStatus: "ENROLLED",
      sourceSessionStatus: "DETAINED",
      promotionType: "DETAINED",
    };
  }

  return {
    classId: promo.toClassId,
    sectionId: promo.toSectionId,
    createEnrollment: true,
    enrollmentStatus: "ENROLLED",
    sourceSessionStatus: "PROMOTED",
    promotionType: promo.status === "CONDITIONAL" ? "CONDITIONAL" : "REGULAR",
  };
}

export const POST = withSchoolAccess(async function POST(req, props) {
  const { schoolId } = await props.params;
  const body = await req.json().catch(() => ({}));
  const {
    promotions: rawPromotions,
    fromYearId,
    toYearId,
    promotedBy,
    preview = false,
    options = {},
  } = body;

  const promotions = Array.isArray(rawPromotions) ? rawPromotions.map(normalizePromotion) : [];

  if (!promotions.length) {
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

  const invalidStatus = promotions.find((promo) => !PROMOTION_STATUSES.has(promo.status));
  if (invalidStatus) {
    return NextResponse.json({ error: `Invalid promotion status: ${invalidStatus.status}` }, { status: 400 });
  }

  try {
    const [fromYear, toYear] = await Promise.all([
      prisma.academicYear.findFirst({ where: { id: fromYearId, schoolId } }),
      prisma.academicYear.findFirst({ where: { id: toYearId, schoolId } }),
    ]);

    if (!fromYear || !toYear) {
      return NextResponse.json({ error: "Invalid academic year(s)" }, { status: 400 });
    }

    if (new Date(fromYear.startDate) >= new Date(toYear.startDate)) {
      return NextResponse.json({ error: "Cannot promote backwards. Source year must be before target year." }, { status: 400 });
    }

    const studentIds = [...new Set(promotions.map((promo) => promo.studentId).filter(Boolean))];
    const sourceEnrollments = await prisma.studentSession.findMany({
      where: {
        studentId: { in: studentIds },
        academicYearId: fromYearId,
        status: "ACTIVE",
        student: { schoolId },
      },
      include: {
        student: true,
        class: { select: { id: true, className: true } },
        section: { select: { id: true, name: true } },
      },
    });
    const sourceByStudent = new Map(sourceEnrollments.map((enrollment) => [enrollment.studentId, enrollment]));

    const targetClassIds = [...new Set(promotions.map((promo) => {
      const source = sourceByStudent.get(promo.studentId);
      return source ? getTargetForPromotion({ promo, sourceEnrollment: source }).classId : promo.toClassId;
    }).filter(Boolean))];
    const targetSectionIds = [...new Set(promotions.map((promo) => {
      const source = sourceByStudent.get(promo.studentId);
      return source ? getTargetForPromotion({ promo, sourceEnrollment: source }).sectionId : promo.toSectionId;
    }).filter(Boolean))];

    const [classes, sections, existingTargetEnrollments] = await Promise.all([
      targetClassIds.length ? prisma.class.findMany({ where: { id: { in: targetClassIds }, schoolId } }) : [],
      targetSectionIds.length ? prisma.section.findMany({ where: { id: { in: targetSectionIds }, class: { schoolId } } }) : [],
      prisma.studentSession.findMany({
        where: {
          studentId: { in: studentIds },
          academicYearId: toYearId,
        },
        select: { studentId: true, id: true },
      }),
    ]);
    const classIds = new Set(classes.map((item) => item.id));
    const sectionIds = new Set(sections.map((item) => item.id));
    const alreadyInTarget = new Set(existingTargetEnrollments.map((item) => item.studentId));

    const rows = promotions.map((promo) => {
      const sourceEnrollment = sourceByStudent.get(promo.studentId);
      if (!sourceEnrollment) {
        return { ...promo, valid: false, error: "No active source enrollment found for selected source session." };
      }

      const target = getTargetForPromotion({ promo, sourceEnrollment });
      if (target.createEnrollment && (!target.classId || !target.sectionId)) {
        return { ...promo, valid: false, name: sourceEnrollment.student.name, error: "Target class and section are required." };
      }
      if (target.classId && !classIds.has(target.classId)) {
        return { ...promo, valid: false, name: sourceEnrollment.student.name, error: "Target class is invalid." };
      }
      if (target.sectionId && !sectionIds.has(target.sectionId)) {
        return { ...promo, valid: false, name: sourceEnrollment.student.name, error: "Target section is invalid." };
      }
      if (alreadyInTarget.has(promo.studentId)) {
        return { ...promo, valid: false, name: sourceEnrollment.student.name, error: `Student already has enrollment in ${toYear.name}.` };
      }
      if (promo.status === "CONDITIONAL" && !promo.remarks) {
        return { ...promo, valid: false, name: sourceEnrollment.student.name, error: "Conditional promotion requires remarks." };
      }

      return {
        ...promo,
        valid: true,
        name: sourceEnrollment.student.name,
        admissionNo: sourceEnrollment.student.admissionNo,
        fromClassName: sourceEnrollment.class?.className || null,
        fromSectionName: sourceEnrollment.section?.name || null,
        target,
      };
    });

    const invalidRows = rows.filter((row) => !row.valid);
    if (preview) {
      return NextResponse.json({
        preview: true,
        total: rows.length,
        valid: rows.length - invalidRows.length,
        invalid: invalidRows.length,
        rows,
      });
    }

    if (invalidRows.length) {
      return NextResponse.json({
        error: "Some promotions failed validation",
        details: invalidRows.map((row) => ({ studentId: row.studentId, name: row.name, error: row.error })),
      }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const promotionBatch = await tx.promotionBatch.create({
        data: {
          schoolId,
          fromAcademicYearId: fromYearId,
          toAcademicYearId: toYearId,
          promotedBy,
          promotionType: options.promotionType || "REGULAR",
          options,
          totalStudents: rows.length,
          status: "RUNNING",
        },
      });

      const updates = [];
      const now = new Date();

      for (const row of rows) {
        const sourceEnrollment = sourceByStudent.get(row.studentId);
        const target = row.target;
        let newEnrollment = null;

        await tx.studentSession.update({
          where: { id: sourceEnrollment.id },
          data: {
            status: target.sourceSessionStatus,
            enrollmentStatus: target.enrollmentStatus,
            leftAt: now,
            remarks: row.remarks || sourceEnrollment.remarks,
          },
        });

        if (target.createEnrollment) {
          newEnrollment = await tx.studentSession.create({
            data: {
              studentId: row.studentId,
              academicYearId: toYearId,
              classId: target.classId,
              sectionId: target.sectionId,
              rollNumber: options.generateRollNumbers ? null : sourceEnrollment.rollNumber,
              status: "ACTIVE",
              enrollmentStatus: "ENROLLED",
              promotedFromEnrollmentId: sourceEnrollment.id,
              promotionBatchId: promotionBatch.id,
              promotionType: target.promotionType,
              remarks: row.remarks,
            },
          });

          if (toYear.isActive) {
            await tx.student.update({
              where: { userId: row.studentId },
              data: {
                currentSessionId: newEnrollment.id,
                academicYearId: toYearId,
                classId: target.classId,
                sectionId: target.sectionId,
                lifecycleStatus: "ACTIVE",
                isAlumni: false,
              },
            });
          }
        } else {
          await tx.student.update({
            where: { userId: row.studentId },
            data: {
              lifecycleStatus: "ALUMNI",
              isAlumni: true,
              alumniConvertedAt: now,
              DateOfLeaving: now,
              currentSessionId: null,
            },
          });

          await tx.alumni.upsert({
            where: { originalStudentId: row.studentId },
            update: {
              lastClassId: sourceEnrollment.classId,
              lastSectionId: sourceEnrollment.sectionId,
              lastAcademicYear: fromYearId,
              graduationYear: now.getFullYear(),
              leavingDate: now,
              leavingReason: "GRADUATED",
            },
            create: {
              schoolId,
              originalStudentId: row.studentId,
              admissionNo: sourceEnrollment.student.admissionNo || "",
              name: sourceEnrollment.student.name,
              email: sourceEnrollment.student.email || "",
              contactNumber: sourceEnrollment.student.contactNumber || "",
              lastClassId: sourceEnrollment.classId,
              lastSectionId: sourceEnrollment.sectionId,
              lastAcademicYear: fromYearId,
              graduationYear: now.getFullYear(),
              leavingDate: now,
              leavingReason: "GRADUATED",
            },
          });
        }

        await tx.promotionHistory.create({
          data: {
            studentId: row.studentId,
            fromClassId: sourceEnrollment.classId,
            toClassId: target.classId,
            fromSectionId: sourceEnrollment.sectionId,
            toSectionId: target.sectionId,
            fromYearId,
            toYearId,
            status: row.status,
            remarks: row.remarks,
            promotedBy,
            batchId: promotionBatch.id,
            promotionBatchId: promotionBatch.id,
          },
        });

        await tx.studentLifecycleAuditLog.create({
          data: {
            schoolId,
            studentId: row.studentId,
            enrollmentId: newEnrollment?.id || sourceEnrollment.id,
            academicYearId: toYearId,
            promotionBatchId: promotionBatch.id,
            actorId: promotedBy,
            action: `STUDENT_${row.status}`,
            entityType: "StudentSession",
            entityId: newEnrollment?.id || sourceEnrollment.id,
            oldValue: {
              enrollmentId: sourceEnrollment.id,
              academicYearId: fromYearId,
              classId: sourceEnrollment.classId,
              sectionId: sourceEnrollment.sectionId,
            },
            newValue: {
              enrollmentId: newEnrollment?.id || null,
              academicYearId: toYearId,
              classId: target.classId,
              sectionId: target.sectionId,
              status: row.status,
            },
          },
        });

        updates.push({ studentId: row.studentId, name: row.name, status: row.status, enrollmentId: newEnrollment?.id || null });
      }

      const summary = {
        promoted: updates.filter((item) => item.status === "PROMOTED").length,
        conditional: updates.filter((item) => item.status === "CONDITIONAL").length,
        detained: updates.filter((item) => item.status === "DETAINED").length,
        graduated: updates.filter((item) => item.status === "GRADUATE").length,
      };

      await tx.promotionBatch.update({
        where: { id: promotionBatch.id },
        data: {
          status: "COMPLETED",
          promotedCount: updates.length,
          skippedCount: 0,
          failedCount: 0,
          options: { ...options, summary },
        },
      });

      return { promotionBatch, updates, summary };
    }, { timeout: 60000, maxWait: 20000 });

    return NextResponse.json({
      message: "Promotions processed successfully",
      count: result.updates.length,
      summary: {
        total: promotions.length,
        ...result.summary,
        errors: 0,
      },
      batchId: result.promotionBatch.id,
    });
  } catch (error) {
    console.error("Error executing promotions:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
});
