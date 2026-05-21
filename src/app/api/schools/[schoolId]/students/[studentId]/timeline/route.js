import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const GET = withSchoolAccess(async function GET(_req, { params }) {
  const { schoolId, studentId } = await params;

  const student = await prisma.student.findFirst({
    where: { userId: studentId, schoolId },
    select: {
      userId: true,
      name: true,
      admissionNo: true,
      lifecycleStatus: true,
      admissionDate: true,
      user: { select: { createdAt: true } },
    },
  });
  if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  const [sessions, promotions, auditLogs, fees, transportAssignments, transportFees] = await Promise.all([
    prisma.studentSession.findMany({
      where: { studentId },
      include: {
        academicYear: { select: { name: true, startDate: true } },
        class: { select: { className: true } },
        section: { select: { name: true } },
      },
      orderBy: [{ joinedAt: "desc" }],
    }),
    prisma.promotionHistory.findMany({
      where: { studentId },
      include: {
        fromYear: { select: { name: true } },
        toYear: { select: { name: true } },
        fromClass: { select: { className: true } },
        toClass: { select: { className: true } },
      },
      orderBy: { promotedAt: "desc" },
      take: 50,
    }),
    prisma.studentLifecycleAuditLog.findMany({
      where: { schoolId, studentId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.studentFee.findMany({
      where: { studentId, schoolId },
      select: {
        id: true,
        status: true,
        finalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        assignedDate: true,
        lastPaymentDate: true,
        academicYear: { select: { name: true } },
        globalFeeStructure: { select: { name: true } },
      },
      orderBy: [{ assignedDate: "desc" }, { id: "desc" }],
      take: 50,
    }),
    prisma.studentRouteAssignment.findMany({
      where: { studentId, schoolId },
      select: {
        id: true,
        assignedAt: true,
        academicYear: { select: { name: true } },
        route: { select: { name: true } },
      },
      orderBy: { assignedAt: "desc" },
      take: 50,
    }),
    prisma.studentTransportFee.findMany({
      where: { studentId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        isActive: true,
        transportFee: { select: { name: true, amount: true, schoolId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const events = [
    {
      type: "PROFILE_CREATED",
      at: student.user?.createdAt,
      title: "Student profile created",
      description: student.admissionNo ? `Admission no ${student.admissionNo}` : null,
    },
    ...(student.admissionDate ? [{
      type: "JOINED",
      at: student.admissionDate,
      title: "Joining date recorded",
      description: new Date(student.admissionDate).toLocaleDateString(),
    }] : []),
    ...sessions.map((session) => ({
      type: "ENROLLMENT",
      at: session.joinedAt,
      title: `${session.enrollmentStatus} in ${session.academicYear?.name || "session"}`,
      description: `${session.class?.className || "-"} / ${session.section?.name || "-"}${session.rollNumber ? ` · Roll ${session.rollNumber}` : ""}`,
      metadata: session,
    })),
    ...promotions.map((promotion) => ({
      type: "PROMOTION",
      at: promotion.promotedAt,
      title: `Promotion ${promotion.status}`,
      description: `${promotion.fromYear?.name || "-"} ${promotion.fromClass?.className || "-"} -> ${promotion.toYear?.name || "-"} ${promotion.toClass?.className || "-"}`,
      metadata: promotion,
    })),
    ...fees.map((fee) => ({
      type: "FEE",
      at: fee.assignedDate || fee.lastPaymentDate,
      title: `Fee ${fee.status}`,
      description: `${fee.academicYear?.name || "-"} · ${fee.globalFeeStructure?.name || "Fee"} · Balance ${fee.balanceAmount}`,
      metadata: fee,
    })),
    ...transportAssignments.map((assignment) => ({
      type: "TRANSPORT_ROUTE",
      at: assignment.assignedAt,
      title: "Transport route assigned",
      description: `${assignment.academicYear?.name || "-"} · ${assignment.route?.name || "-"}`,
      metadata: assignment,
    })),
    ...transportFees.filter((fee) => fee.transportFee?.schoolId === schoolId).map((fee) => ({
      type: "TRANSPORT_FEE",
      at: fee.startDate,
      title: fee.isActive ? "Transport fee active" : "Transport fee ended",
      description: `${fee.transportFee?.name || "Transport fee"} · ${fee.transportFee?.amount || 0}`,
      metadata: fee,
    })),
    ...auditLogs.map((log) => ({
      type: "AUDIT",
      at: log.createdAt,
      title: log.action,
      description: log.entityType,
      metadata: log,
    })),
  ].filter((event) => event.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return NextResponse.json({
    student,
    sessions,
    promotions,
    auditLogs,
    fees,
    transportAssignments,
    events,
  });
});
