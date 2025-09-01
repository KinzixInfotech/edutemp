import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
    schoolId: z.string().uuid(),
    academicYearId: z.string().uuid(),
    classId: z.number().int().optional(),
    fees: z.array(
        z.object({
            name: z.string().min(1),
            amount: z.number().positive(),
            mode: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]),
        })
    ),
})

export async function POST(req) {
    try {
        const body = await req.json()
        const parsed = schema.parse(body)

        const feeStructures = await prisma.feeStructure.createMany({
            data: parsed.fees.map((f) => ({
                schoolId: parsed.schoolId,
                academicYearId: parsed.academicYearId,
                classId: parsed.classId ?? null,
                issueDate: new Date(),
                mode: f.mode,
                name: f.name,
                amount: f.amount,
            })),
        })
        return NextResponse.json(
            { message: "Fee structures created", count: feeStructures.count },
            { status: 201 }
        )
    } catch (err) {
        console.error("FeeStructure API error:", err)
        return NextResponse.json(
            { error: err.message || "Invalid request" },
            { status: 400 }
        )
    }
}
