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

        // Normalize classId into array
        const classIds = Array.isArray(classId)
            ? classId
            : classId
                ? [classId]
                : [];

        let students = [];

        if (applyToAllStudents) {
            students = await prisma.student.findMany({
                where: { academicYearId },
            });
        } else if (classIds.length > 0) {
            // Check if *this* feeStructure is already linked to this class
            const alreadyLinked = await prisma.feeStructure.findFirst({
                where: {
                    id: feeStructure.id,
                    classId: { in: classIds },
                    academicYearId,
                },
            });

            if (alreadyLinked) {
                return NextResponse.json(
                    { error: "Fee structure already assigned to this class" },
                    { status: 400 }
                );
            }

            // Check if another FeeStructure exists for this class
            const oldStructure = await prisma.feeStructure.findFirst({
                where: {
                    classId: { in: classIds },
                    academicYearId,
                    NOT: { id: feeStructure.id },
                },
            });

            if (oldStructure) {
                // Remove all old student mappings
                await prisma.studentFeeParticular.deleteMany({
                    where: {
                        studentFeeStructure: {
                            academicYearId,
                            schoolId: feeStructure.schoolId,
                            student: { classId: { in: classIds } },
                        },
                    },
                });

                await prisma.studentFeeStructure.deleteMany({
                    where: {
                        academicYearId,
                        schoolId: feeStructure.schoolId,
                        student: { classId: { in: classIds } },
                    },
                });
            }

            // Link new FeeStructure to this class
            await prisma.feeStructure.update({
                where: { id: feeStructure.id },
                data: { classId: classIds[0] }, // single class at a time
            });

            // Fetch students of this class
            students = await prisma.student.findMany({
                where: {
                    academicYearId,
                    classId: { in: classIds.map((id) => Number(id)) },
                },
            });
        }

        if (!students.length) {
            return NextResponse.json(
                { error: "No students found to assign" },
                { status: 404 }
            );
        }

        // Assign FeeStructure to each student
        for (const student of students) {
            const alreadyAssigned = await prisma.studentFeeStructure.findFirst({
                where: {
                    studentId: student.userId,
                    academicYearId,
                    feeStructureId: feeStructure.id,
                },
            });

            if (alreadyAssigned) continue;

            const studentFeeStructure = await prisma.studentFeeStructure.create({
                data: {
                    studentId: student.userId,
                    academicYearId,
                    schoolId: student.schoolId,
                    studentUserId: student.userId,
                    feeStructureId: feeStructure.id,
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