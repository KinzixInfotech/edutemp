// ============================================
// API: /api/fee/assign/route.js
// Assign fees to students (bulk or individual)
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST: Assign fee structure to students
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      globalFeeStructureId,
      studentIds, // Array of student IDs
      applyToClass, // Boolean: assign to all students in class
      classId,
      sectionId,
      academicYearId,
      schoolId,
    } = body;

    if (!schoolId || !academicYearId) {
      return NextResponse.json(
        { error: "schoolId and academicYearId required" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Fetch global structure
      const globalStructure = await tx.globalFeeStructure.findUnique({
        where: { id: globalFeeStructureId },
        include: {
          particulars: true,
          installmentRules: { orderBy: { installmentNumber: "asc" } },
        },
      });

      if (!globalStructure) {
        throw new Error("Fee structure not found");
      }

      // Determine which students to assign
      let studentsToAssign = [];

      if (applyToClass && classId) {
        const where = {
          schoolId,
          academicYearId,
          classId: parseInt(classId),
          ...(sectionId && { sectionId: parseInt(sectionId) }),
        };
        studentsToAssign = await tx.student.findMany({ where });
      } else if (studentIds && studentIds.length > 0) {
        studentsToAssign = await tx.student.findMany({
          where: {
            userId: { in: studentIds },
            schoolId,
            academicYearId,
          },
        });
      } else {
        throw new Error("No students specified for assignment");
      }

      if (studentsToAssign.length === 0) {
        throw new Error("No eligible students found");
      }

      const assignedStudents = [];
      const skippedStudents = [];

      for (const student of studentsToAssign) {
        // Check if already assigned
        const existing = await tx.studentFee.findUnique({
          where: {
            studentId_academicYearId: {
              studentId: student.userId,
              academicYearId,
            },
          },
        });

        if (existing) {
          skippedStudents.push({
            studentId: student.userId,
            name: student.name,
            reason: "Already assigned",
          });
          continue;
        }

        // Create StudentFee
        const studentFee = await tx.studentFee.create({
          data: {
            studentId: student.userId,
            schoolId,
            academicYearId,
            globalFeeStructureId: globalStructure.id,
            originalAmount: globalStructure.totalAmount,
            finalAmount: globalStructure.totalAmount,
            balanceAmount: globalStructure.totalAmount,
            status: "UNPAID",
          },
        });

        // Create StudentFeeParticulars
        await tx.studentFeeParticular.createMany({
          data: globalStructure.particulars.map(particular => ({
            studentFeeId: studentFee.id,
            globalParticularId: particular.id,
            name: particular.name,
            amount: particular.amount,
            status: "UNPAID",
          })),
        });

        // Create Installments
        if (globalStructure.installmentRules.length > 0) {
          await tx.studentFeeInstallment.createMany({
            data: globalStructure.installmentRules.map(rule => ({
              studentFeeId: studentFee.id,
              installmentRuleId: rule.id,
              installmentNumber: rule.installmentNumber,
              dueDate: rule.dueDate,
              amount: rule.amount,
              status: "PENDING",
            })),
          });
        }

        assignedStudents.push({
          studentId: student.userId,
          name: student.name,
        });
      }

      return {
        assigned: assignedStudents.length,
        skipped: skippedStudents.length,
        assignedStudents,
        skippedStudents,
      };
    });

    return NextResponse.json({
      message: "Fee assignment completed",
      ...result,
    });
  } catch (error) {
    console.error("Assign Fee Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to assign fees" },
      { status: 400 }
    );
  }
}



