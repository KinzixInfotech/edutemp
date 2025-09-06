// /api/students/[studentId]/fee-structures/route.js - For fetching a student's fee structures

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req, { params }) {
    try {
        const { studentId } = params;

        if (!studentId) {
            return NextResponse.json({ error: "studentId is required" }, { status: 400 });
        }

        const studentFeeStructures = await prisma.studentFeeStructure.findMany({
            where: { studentUserId: studentId },
            include: {
                feeStructure: {
                    include: {
                        AcademicYear: { select: { name: true } },
                        feeParticulars: true,
                    },
                },
                feeParticulars: true,
            },
        });

        // Map to show effective amounts (use student amount if set, else default)
        const data = studentFeeStructures.map((sfs) => ({
            ...sfs,
            feeStructure: {
                ...sfs.feeStructure,
                feeParticulars: sfs.feeStructure.feeParticulars.map((particular) => {
                    const studentParticular = sfs.feeParticulars.find(
                        (sp) => sp.globalParticularId === particular.id
                    );
                    return {
                        ...particular,
                        effectiveAmount: studentParticular?.amount ?? particular.defaultAmount,
                        status: studentParticular?.status,
                    };
                }),
            },
        }));

        return NextResponse.json(data);
    } catch (err) {
        console.error("Fetch Student Fee Structures API error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}