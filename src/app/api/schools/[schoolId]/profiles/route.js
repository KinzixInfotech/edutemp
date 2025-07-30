import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request, { params }) {
    const { schoolId } = params

    try {
        const [students] = await Promise.all([
            prisma.student.findMany({
                where: { schoolId },
                include: {
                    class: true,     // ✅ get class info
                    section: true,   // ✅ optionally get section too
                },
            }),
        ])

        return NextResponse.json({ students })
    } catch (err) {
        console.error("[PROFILES_FETCH]", err)
        return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
    }
}
