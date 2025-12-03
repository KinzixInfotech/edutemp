import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req) {
    try {
        const body = await req.json()
        const { academicYearId } = body

        if (!academicYearId) {
            return NextResponse.json({ error: "Academic Year ID is required" }, { status: 400 })
        }

        // 1. Get the academic year to find the schoolId
        const targetYear = await prisma.academicYear.findUnique({
            where: { id: academicYearId },
            select: { schoolId: true }
        })

        if (!targetYear) {
            return NextResponse.json({ error: "Academic year not found" }, { status: 404 })
        }

        const schoolId = targetYear.schoolId

        // 2. Use transaction to update statuses
        await prisma.$transaction([
            // Deactivate all years for this school
            prisma.academicYear.updateMany({
                where: { schoolId },
                data: { isActive: false }
            }),
            // Activate the target year
            prisma.academicYear.update({
                where: { id: academicYearId },
                data: { isActive: true }
            })
        ])

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to activate academic year:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
