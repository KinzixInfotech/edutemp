import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const { feeStructureId, academicYearId, classId, applyToAllStudents } =
            await req.json();

        if (!feeStructureId || !academicYearId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Fetch FeeStructure with particulars
        const feeStructure = await prisma.feeStructure.findUnique({
            where: { id: feeStructureId },
            include: { feeParticulars: true },
        });

        if (!feeStructure) {
            return NextResponse.json(
                { error: "Fee structure not found" },
                { status: 404 }
            );
        }

        // Normalize classId into an array
        const classIds = Array.isArray(classId)
            ? classId
            : classId
                ? [classId]
                : [];

        // Collect students
        let students = [];

        if (applyToAllStudents) {
            // All students of this academic year
            students = await prisma.student.findMany({
                where: { academicYearId },
            });
        } else if (classIds.length > 0) {
            // Specific classes
            students = await prisma.student.findMany({
                where: {
                    academicYearId,
                    classId: {
                        in: classIds.map((id) => Number(id)), // handles [1], [1,2,3]
                    },
                },
            });
        }

        if (!students.length) {
            return NextResponse.json(
                { error: "No students found to assign" },
                { status: 404 }
            );
        }

        // Assign fee structure to each student
        for (const student of students) {
            const studentFeeStructure = await prisma.studentFeeStructure.create({
                data: {
                    studentId: student.userId,
                    academicYearId,
                    schoolId: student.schoolId,
                    studentUserId: student.userId,
                },
            });

            if (feeStructure.feeParticulars.length > 0) {
                await prisma.studentFeeParticular.createMany({
                    data: feeStructure.feeParticulars.map((part) => ({
                        studentFeeStructureId: studentFeeStructure.id,
                        globalParticularId: part.id,
                        amount: part.defaultAmount,
                    })),
                });
            }
        }

        return NextResponse.json({ success: true, count: students.length });
    } catch (error) {
        console.error("Assign FeeStructure error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
