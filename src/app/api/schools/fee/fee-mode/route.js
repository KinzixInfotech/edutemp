import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
// import { prisma } from "@/lib/prisma"

export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const schoolId = searchParams.get("schoolId")

    if (!schoolId) {
        return NextResponse.json({ error: "schoolId required" }, { status: 400 })
    }

    // check if any FeeStructure exists with a mode
    const feeStructure = await prisma.feeStructure.findFirst({
        where: { student: { schoolId } },
        select: { mode: true },
    })

    return NextResponse.json({
        hasFeeMode: !!feeStructure?.mode,
        mode: feeStructure?.mode ?? null,
    })
}
