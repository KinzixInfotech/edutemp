import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
    const latest = await prisma.school.findFirst({
        where: { schoolCode: { startsWith: "EB-" } },
        orderBy: { createdAt: "desc" },
        select: { schoolCode: true },
    })

    const lastNumber = latest?.schoolCode
        ? parseInt(latest.schoolCode.split("-")[1])
        : 0

    const nextNumber = lastNumber + 1
    const nextCode = `EB-${String(nextNumber).padStart(5, "0")}`

    return NextResponse.json({ code: nextCode })
}
