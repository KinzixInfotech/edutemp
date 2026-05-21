import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supbase-admin";

async function buildRollbackConflictReport(tx, { schoolId, batchId }) {
  const batch = await tx.importBatch.findFirst({
    where: { id: batchId, schoolId },
    select: { id: true, status: true },
  });

  if (!batch) {
    return { batch: null, conflicts: [{ type: "BATCH_NOT_FOUND", message: "Import batch not found." }] };
  }

  const importedStudents = await tx.student.findMany({
    where: { schoolId, importBatchId: batchId },
    select: { userId: true, name: true, admissionNo: true },
  });
  const studentIds = importedStudents.map((student) => student.userId);

  const [
    paidStudentFees,
    feePayments,
    paidLedgers,
    transportFeePayments,
    attendanceRecords,
    externalEnrollments,
  ] = await Promise.all([
    tx.studentFee.count({ where: { importBatchId: batchId, paidAmount: { gt: 0 } } }),
    studentIds.length ? tx.feePayment.count({ where: { studentId: { in: studentIds } } }) : 0,
    tx.studentFeeLedger.count({ where: { importBatchId: batchId, paidAmount: { gt: 0 } } }),
    tx.transportFeePayment.count({ where: { studentTransportFee: { importBatchId: batchId } } }),
    studentIds.length ? tx.attendance.count({ where: { userId: { in: studentIds } } }) : 0,
    studentIds.length ? tx.studentSession.count({
      where: {
        studentId: { in: studentIds },
        importBatchId: { not: batchId },
      },
    }) : 0,
  ]);

  const conflicts = [];
  if (paidStudentFees || feePayments || paidLedgers) {
    conflicts.push({
      type: "FINANCIAL_ACTIVITY_EXISTS",
      message: "Some imported records already have payments or paid ledger activity.",
      paidStudentFees,
      feePayments,
      paidLedgers,
    });
  }
  if (transportFeePayments) {
    conflicts.push({
      type: "TRANSPORT_PAYMENTS_EXIST",
      message: "Some imported transport fee assignments already have payments.",
      transportFeePayments,
    });
  }
  if (attendanceRecords) {
    conflicts.push({
      type: "ATTENDANCE_EXISTS",
      message: "Imported students already have attendance records. Student deletion will be blocked.",
      attendanceRecords,
    });
  }
  if (externalEnrollments) {
    conflicts.push({
      type: "OTHER_ENROLLMENTS_EXIST",
      message: "Some imported students have enrollments outside this import batch.",
      externalEnrollments,
    });
  }

  return { batch, conflicts, importedStudents };
}

export const POST = withSchoolAccess(async function POST(req, { params }) {
  const { schoolId, batchId } = await params;
  const body = await req.json().catch(() => ({}));
  const actorId = body.actorId || null;
  const deleteImportedOnlyStudents = Boolean(body.deleteImportedOnlyStudents);
  const deleteAuthAccounts = Boolean(body.deleteAuthAccounts);
  const deleteAssociatedParents = Boolean(body.deleteAssociatedParents);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const report = await buildRollbackConflictReport(tx, { schoolId, batchId });
      if (!report.batch) {
        return { status: "ROLLBACK_BLOCKED", conflicts: report.conflicts };
      }

      if (report.conflicts.some((conflict) => conflict.type !== "ATTENDANCE_EXISTS" && conflict.type !== "OTHER_ENROLLMENTS_EXIST")) {
        await tx.importBatch.update({
          where: { id: batchId },
          data: {
            status: "ROLLBACK_BLOCKED",
            rollbackStatus: "ROLLBACK_BLOCKED",
            rollbackReport: report,
            rolledBackAt: new Date(),
            rolledBackBy: actorId,
          },
        });
        return { status: "ROLLBACK_BLOCKED", conflicts: report.conflicts };
      }

      const deleted = {
        resolutionIssues: 0,
        feeLedgers: 0,
        studentFees: 0,
        routeAssignments: 0,
        stopAssignments: 0,
        transportFees: 0,
        promotionHistory: 0,
        enrollments: 0,
        students: 0,
        parents: 0,
      };

      deleted.resolutionIssues = (await tx.enrollmentResolutionIssue.deleteMany({ where: { importBatchId: batchId } })).count;
      deleted.feeLedgers = (await tx.studentFeeLedger.deleteMany({ where: { importBatchId: batchId, paidAmount: 0 } })).count;
      deleted.studentFees = (await tx.studentFee.deleteMany({ where: { importBatchId: batchId, paidAmount: 0 } })).count;
      deleted.routeAssignments = (await tx.studentRouteAssignment.deleteMany({ where: { importBatchId: batchId } })).count;
      deleted.stopAssignments = (await tx.studentStopAssignment.deleteMany({ where: { importBatchId: batchId } })).count;
      deleted.transportFees = (await tx.studentTransportFee.deleteMany({ where: { importBatchId: batchId } })).count;
      deleted.promotionHistory = (await tx.promotionHistory.deleteMany({ where: { importBatchId: batchId } })).count;

      const importedEnrollmentStudentIds = (await tx.studentSession.findMany({
        where: { importBatchId: batchId },
        select: { id: true, studentId: true },
      }));
      const importedEnrollmentIds = importedEnrollmentStudentIds.map((item) => item.id);
      const importedStudentIds = importedEnrollmentStudentIds.map((item) => item.studentId);

      if (importedEnrollmentIds.length) {
        await tx.student.updateMany({
          where: { userId: { in: importedStudentIds }, currentSessionId: { in: importedEnrollmentIds } },
          data: {
            currentSessionId: null,
            classId: null,
            sectionId: null,
            academicYearId: null,
          },
        });
      }

      deleted.enrollments = (await tx.studentSession.deleteMany({ where: { importBatchId: batchId } })).count;

      if (importedStudentIds.length) {
        await tx.student.updateMany({
          where: {
            userId: { in: importedStudentIds },
            importBatchId: batchId,
            currentSessionId: null,
          },
          data: {
            classId: null,
            sectionId: null,
            academicYearId: null,
          },
        });
      }

      const canDeleteStudents = deleteImportedOnlyStudents &&
        !report.conflicts.some((conflict) => ["ATTENDANCE_EXISTS", "OTHER_ENROLLMENTS_EXIST"].includes(conflict.type));

      if (canDeleteStudents && report.importedStudents?.length) {
        const studentIds = report.importedStudents.map((student) => student.userId);
        let parentIdsToDelete = [];

        if (deleteAssociatedParents) {
          const links = await tx.studentParentLink.findMany({
            where: { studentId: { in: studentIds } },
            select: { parentId: true }
          });
          const linkedParentIds = [...new Set(links.map(l => l.parentId))];
          
          if (linkedParentIds.length > 0) {
            const outsideLinks = await tx.studentParentLink.findMany({
              where: {
                parentId: { in: linkedParentIds },
                studentId: { notIn: studentIds }
              },
              select: { parentId: true }
            });
            const unsafeParentIds = new Set(outsideLinks.map(l => l.parentId));
            const safeParentIds = linkedParentIds.filter(pid => !unsafeParentIds.has(pid));
            
            if (safeParentIds.length > 0) {
              const parents = await tx.parent.findMany({
                where: { id: { in: safeParentIds } },
                select: { userId: true }
              });
              parentIdsToDelete = parents.map(p => p.userId);
              
              await tx.studentParentLink.deleteMany({ where: { parentId: { in: safeParentIds } } });
              deleted.parents = (await tx.parent.deleteMany({ where: { id: { in: safeParentIds } } })).count;
              await tx.user.updateMany({
                where: { id: { in: parentIdsToDelete } },
                data: { status: "INACTIVE", deletedAt: new Date() }
              });
            }
          }
        }

        await tx.studentParentLink.deleteMany({ where: { studentId: { in: studentIds } } });
        deleted.students = (await tx.student.deleteMany({ where: { userId: { in: studentIds }, importBatchId: batchId } })).count;
        await tx.user.updateMany({
          where: { id: { in: studentIds } },
          data: { status: "INACTIVE", deletedAt: new Date() },
        });

        if (deleteAuthAccounts) {
           deleted.authDeletionIds = [...studentIds, ...parentIdsToDelete];
        }
      }

      await tx.importBatch.update({
        where: { id: batchId },
        data: {
          status: "ROLLED_BACK",
          rollbackStatus: "ROLLED_BACK",
          rollbackReport: { deleted, conflicts: report.conflicts },
          rolledBackAt: new Date(),
          rolledBackBy: actorId,
        },
      });

      await tx.studentLifecycleAuditLog.create({
        data: {
          schoolId,
          importBatchId: batchId,
          actorId,
          action: "IMPORT_BATCH_ROLLBACK",
          entityType: "ImportBatch",
          entityId: batchId,
          newValue: { deleted, conflicts: report.conflicts },
        },
      });

      return { status: "ROLLED_BACK", deleted, conflicts: report.conflicts, authDeletionIds: deleted.authDeletionIds || [] };
    }, { timeout: 60000, maxWait: 20000 });

    if (result.status === "ROLLED_BACK" && deleteAuthAccounts && result.authDeletionIds?.length > 0) {
      try {
        const authDeletions = result.authDeletionIds.map(uid => 
          supabaseAdmin.auth.admin.deleteUser(uid).catch(e => console.error(`Supabase Auth delete failed for ${uid}:`, e))
        );
        await Promise.allSettled(authDeletions);
        console.log(`Deleted ${result.authDeletionIds.length} Supabase Auth accounts for rollback.`);
      } catch (err) {
        console.error("Failed to delete some Supabase auth accounts during rollback:", err);
      }
    }

    const httpStatus = result.status === "ROLLBACK_BLOCKED" ? 409 : 200;
    return NextResponse.json(result, { status: httpStatus });
  } catch (error) {
    console.error("[IMPORT BATCH ROLLBACK ERROR]", error);
    return NextResponse.json({ error: error.message || "Rollback failed" }, { status: 500 });
  }
});
