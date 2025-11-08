// // ============================================
// // API: /api/fee/admin/dashboard/route.js
// // Admin fee collection dashboard stats
// // ============================================

// import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";

// export async function GET(req) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const schoolId = searchParams.get("schoolId");
//     const academicYearId = searchParams.get("academicYearId");
//     const classId = searchParams.get("classId");
//     const startDate = searchParams.get("startDate");
//     const endDate = searchParams.get("endDate");

//     if (!schoolId || !academicYearId) {
//       return NextResponse.json(
//         { error: "schoolId and academicYearId required" },
//         { status: 400 }
//       );
//     }

//     const where = {
//       schoolId,
//       academicYearId,
//       ...(classId && { student: { classId: parseInt(classId) } }),
//     };

//     // Parallel queries for performance
//     const [
//       totalExpected,
//       totalCollected,
//       totalDiscount,
//       totalBalance,
//       paidCount,
//       partialCount,
//       unpaidCount,
//       overdueCount,
//       recentPayments,
//       overdueStudents,
//       classWiseStats,
//       paymentMethodStats,
//       monthlyCollection,
//     ] = await Promise.all([
//       // Total Expected
//       prisma.studentFee.aggregate({
//         where,
//         _sum: { originalAmount: true },
//       }),

//       // Total Collected
//       prisma.studentFee.aggregate({
//         where,
//         _sum: { paidAmount: true },
//       }),

//       // Total Discount
//       prisma.studentFee.aggregate({
//         where,
//         _sum: { discountAmount: true },
//       }),

//       // Total Balance
//       prisma.studentFee.aggregate({
//         where,
//         _sum: { balanceAmount: true },
//       }),

//       // Status Counts
//       prisma.studentFee.count({ where: { ...where, status: "PAID" } }),
//       prisma.studentFee.count({ where: { ...where, status: "PARTIAL" } }),
//       prisma.studentFee.count({ where: { ...where, status: "UNPAID" } }),
//       prisma.studentFee.count({ where: { ...where, status: "OVERDUE" } }),

//       // Recent Payments (last 10)
//       prisma.feePayment.findMany({
//         where: {
//           schoolId,
//           academicYearId,
//           status: "SUCCESS",
//           ...(startDate && endDate && {
//             paymentDate: {
//               gte: new Date(startDate),
//               lte: new Date(endDate),
//             },
//           }),
//         },
//         include: {
//           student: {
//             select: {
//               name: true,
//               admissionNo: true,
//               class: { select: { className: true } },
//             },
//           },
//         },
//         orderBy: { paymentDate: "desc" },
//         take: 10,
//       }),

//       // Overdue Students
//       prisma.studentFee.findMany({
//         where: {
//           ...where,
//           status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
//           installments: {
//             some: {
//               isOverdue: true,
//               status: { not: "PAID" },
//             },
//           },
//         },
//         include: {
//           student: {
//             select: {
//               userId: true,
//               name: true,
//               admissionNo: true,
//               class: { select: { className: true } },
//               section: { select: { name: true } },
//             },
//           },
//           installments: {
//             where: { isOverdue: true, status: { not: "PAID" } },
//             orderBy: { dueDate: "asc" },
//           },
//         },
//         take: 20,
//       }),

//       // Class-wise collection stats
//       prisma.studentFee.groupBy({
//         by: ["studentId"],
//         where,
//         _sum: {
//           originalAmount: true,
//           paidAmount: true,
//           balanceAmount: true,
//         },
//       }).then(async (results) => {
//         const studentIds = results.map(r => r.studentId);
//         const students = await prisma.student.findMany({
//           where: { userId: { in: studentIds } },
//           select: { userId: true, classId: true },
//         });

//         const classMap = {};
//         students.forEach(s => {
//           if (!classMap[s.classId]) {
//             classMap[s.classId] = {
//               expected: 0,
//               collected: 0,
//               balance: 0,
//               count: 0,
//             };
//           }
//         });

//         results.forEach(r => {
//           const student = students.find(s => s.userId === r.studentId);
//           if (student) {
//             const stats = classMap[student.classId];
//             stats.expected += r._sum.originalAmount || 0;
//             stats.collected += r._sum.paidAmount || 0;
//             stats.balance += r._sum.balanceAmount || 0;
//             stats.count += 1;
//           }
//         });

//         const classes = await prisma.class.findMany({
//           where: { id: { in: Object.keys(classMap).map(Number) } },
//           select: { id: true, className: true },
//         });

//         return classes.map(c => ({
//           classId: c.id,
//           className: c.className,
//           ...classMap[c.id],
//         }));
//       }),

//       // Payment method distribution
//       prisma.feePayment.groupBy({
//         by: ["paymentMethod"],
//         where: {
//           schoolId,
//           academicYearId,
//           status: "SUCCESS",
//           ...(startDate && endDate && {
//             paymentDate: {
//               gte: new Date(startDate),
//               lte: new Date(endDate),
//             },
//           }),
//         },
//         _sum: { amount: true },
//         _count: true,
//       }),

//       // Monthly collection trend
//       prisma.$queryRaw`
//         SELECT 
//           DATE_TRUNC('month', "paymentDate") as month,
//           SUM(amount) as total,
//           COUNT(*) as count
//         FROM "FeePayment"
//         WHERE "schoolId" = ${schoolId}::uuid
//           AND "academicYearId" = ${academicYearId}::uuid
//           AND status = 'SUCCESS'
//           ${startDate && endDate ? prisma.raw(`AND "paymentDate" BETWEEN '${startDate}'::timestamp AND '${endDate}'::timestamp`) : prisma.raw('')}
//         GROUP BY month
//         ORDER BY month DESC
//         LIMIT 12
//       `,
//     ]);

//     return NextResponse.json({
//       summary: {
//         totalExpected: totalExpected._sum.originalAmount || 0,
//         totalCollected: totalCollected._sum.paidAmount || 0,
//         totalDiscount: totalDiscount._sum.discountAmount || 0,
//         totalBalance: totalBalance._sum.balanceAmount || 0,
//         collectionPercentage: totalExpected._sum.originalAmount
//           ? ((totalCollected._sum.paidAmount / totalExpected._sum.originalAmount) * 100).toFixed(2)
//           : 0,
//       },
//       statusCounts: {
//         paid: paidCount,
//         partial: partialCount,
//         unpaid: unpaidCount,
//         overdue: overdueCount,
//         total: paidCount + partialCount + unpaidCount + overdueCount,
//       },
//       recentPayments,
//       overdueStudents: overdueStudents.map(sf => ({
//         ...sf.student,
//         balanceAmount: sf.balanceAmount,
//         overdueInstallments: sf.installments,
//       })),
//       classWiseStats,
//       paymentMethodStats,
//       monthlyCollection,
//     });
//   } catch (error) {
//     console.error("Dashboard Stats Error:", error);
//     return NextResponse.json(
//       { error: "Failed to fetch dashboard stats" },
//       { status: 500 }
//     );
//   }
// }


// ============================================
// API: /api/fee/admin/dashboard/route.js
// Admin fee collection dashboard stats
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("schoolId");
    const academicYearId = searchParams.get("academicYearId");
    const classId = searchParams.get("classId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!schoolId || !academicYearId) {
      return NextResponse.json(
        { error: "schoolId and academicYearId required" },
        { status: 400 }
      );
    }

    const where = {
      schoolId,
      academicYearId,
      ...(classId && { student: { classId: parseInt(classId) } }),
    };

    // Parallel queries for performance
    const [
      totalExpected,
      totalCollected,
      totalDiscount,
      totalBalance,
      paidCount,
      partialCount,
      unpaidCount,
      overdueCount,
      recentPayments,
      overdueStudents,
      classWiseStats,
      paymentMethodStats,
      monthlyCollection,
    ] = await Promise.all([
      // Total Expected
      prisma.studentFee.aggregate({
        where,
        _sum: { originalAmount: true },
      }),

      // Total Collected
      prisma.studentFee.aggregate({
        where,
        _sum: { paidAmount: true },
      }),

      // Total Discount
      prisma.studentFee.aggregate({
        where,
        _sum: { discountAmount: true },
      }),

      // Total Balance
      prisma.studentFee.aggregate({
        where,
        _sum: { balanceAmount: true },
      }),

      // Status Counts
      prisma.studentFee.count({ where: { ...where, status: "PAID" } }),
      prisma.studentFee.count({ where: { ...where, status: "PARTIAL" } }),
      prisma.studentFee.count({ where: { ...where, status: "UNPAID" } }),
      prisma.studentFee.count({ where: { ...where, status: "OVERDUE" } }),

      // Recent Payments (last 10)
      prisma.feePayment.findMany({
        where: {
          schoolId,
          academicYearId,
          status: "SUCCESS",
          ...(startDate && endDate && {
            paymentDate: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
        },
        include: {
          student: {
            select: {
              name: true,
              admissionNo: true,
              class: { select: { className: true } },
            },
          },
        },
        orderBy: { paymentDate: "desc" },
        take: 10,
      }),

      // Overdue Students
      prisma.studentFee.findMany({
        where: {
          ...where,
          status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
          installments: {
            some: {
              isOverdue: true,
              status: { not: "PAID" },
            },
          },
        },
        include: {
          student: {
            select: {
              userId: true,
              name: true,
              admissionNo: true,
              class: { select: { className: true } },
              section: { select: { name: true } },
            },
          },
          installments: {
            where: { isOverdue: true, status: { not: "PAID" } },
            orderBy: { dueDate: "asc" },
          },
        },
        take: 20,
      }),

      // Class-wise collection stats
      prisma.studentFee
        .groupBy({
          by: ["studentId"],
          where,
          _sum: {
            originalAmount: true,
            paidAmount: true,
            balanceAmount: true,
          },
        })
        .then(async (results) => {
          const studentIds = results.map((r) => r.studentId);
          const students = await prisma.student.findMany({
            where: { userId: { in: studentIds } },
            select: { userId: true, classId: true },
          });

          const classMap = {};
          students.forEach((s) => {
            if (!classMap[s.classId]) {
              classMap[s.classId] = {
                expected: 0,
                collected: 0,
                balance: 0,
                count: 0,
              };
            }
          });

          results.forEach((r) => {
            const student = students.find((s) => s.userId === r.studentId);
            if (student) {
              const stats = classMap[student.classId];
              stats.expected += r._sum.originalAmount || 0;
              stats.collected += r._sum.paidAmount || 0;
              stats.balance += r._sum.balanceAmount || 0;
              stats.count += 1;
            }
          });

          const classes = await prisma.class.findMany({
            where: { id: { in: Object.keys(classMap).map(Number) } },
            select: { id: true, className: true },
          });

          return classes.map((c) => ({
            classId: c.id,
            className: c.className,
            ...classMap[c.id],
          }));
        }),

      // Payment method distribution
      prisma.feePayment.groupBy({
        by: ["paymentMethod"],
        where: {
          schoolId,
          academicYearId,
          status: "SUCCESS",
          ...(startDate && endDate && {
            paymentDate: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
        },
        _sum: { amount: true },
        _count: true,
      }),

      // Monthly collection trend (✅ FIXED)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "paymentDate") as month,
          SUM(amount) as total,
          COUNT(*) as count
        FROM "FeePayment"
        WHERE "schoolId" = ${schoolId}::uuid
          AND "academicYearId" = ${academicYearId}::uuid
          AND status = 'SUCCESS'
          ${startDate && endDate ? Prisma.sql`AND "paymentDate" BETWEEN ${new Date(startDate)} AND ${new Date(endDate)}` : Prisma.empty}
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      `,
    ]);

    return NextResponse.json({
      summary: {
        totalExpected: totalExpected._sum.originalAmount || 0,
        totalCollected: totalCollected._sum.paidAmount || 0,
        totalDiscount: totalDiscount._sum.discountAmount || 0,
        totalBalance: totalBalance._sum.balanceAmount || 0,
        collectionPercentage: totalExpected._sum.originalAmount
          ? (
            (totalCollected._sum.paidAmount /
              totalExpected._sum.originalAmount) *
            100
          ).toFixed(2)
          : 0,
      },
      statusCounts: {
        paid: paidCount,
        partial: partialCount,
        unpaid: unpaidCount,
        overdue: overdueCount,
        total: paidCount + partialCount + unpaidCount + overdueCount,
      },
      recentPayments,
      overdueStudents: overdueStudents.map((sf) => ({
        ...sf.student,
        balanceAmount: sf.balanceAmount,
        overdueInstallments: sf.installments,
      })),
      classWiseStats,
      paymentMethodStats,
      monthlyCollection,
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
