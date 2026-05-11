import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const GET = withSchoolAccess(async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId");
    const studentId = searchParams.get("studentId");
    const academicYearId = searchParams.get("academicYearId");

    if (!parentId) {
      return NextResponse.json(
        { error: "parentId required" },
        { status: 400 }
      );
    }

    // Verify parent owns this student
    const student = studentId ?
    await prisma.student.findFirst({
      where: {
        userId: studentId,
        studentParentLinks: {
          some: {
            parentId: parentId
          }
        }
      }
    }) :
    null;

    if (studentId && !student) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const where = {
      student: {
        studentParentLinks: {
          some: {
            parentId: parentId
          }
        }
      },
      ...(studentId && { studentId }),
      ...(academicYearId && { academicYearId }),
      status: "SUCCESS"
    };

    const payments = await prisma.feePayment.findMany({
      where,
      include: {
        student: {
          select: {
            name: true,
            admissionNo: true,
            class: { select: { className: true } }
          }
        },
        installmentPayments: {
          include: {
            installment: {
              select: {
                installmentNumber: true,
                dueDate: true
              }
            }
          }
        },
        paymentAllocations: {
          include: {
            ledgerEntry: {
              select: {
                id: true,
                month: true,
                monthLabel: true,
                feeComponent: {
                  select: { name: true, type: true, category: true }
                }
              }
            }
          }
        }
      },
      orderBy: { paymentDate: "desc" }
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Payment History Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    );
  }
});
