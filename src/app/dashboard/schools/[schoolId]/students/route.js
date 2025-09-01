import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req, { params }) {
    const { schoolId } = params

    if (!schoolId || typeof schoolId !== "string") {
        return NextResponse.json({ error: "Invalid school ID" }, { status: 400 })
    }
    console.log(schoolId)
    try {
        const page = parseInt(req.nextUrl.searchParams.get("page") || "1")
        const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20")
        const offset = (page - 1) * limit

        const students = await prisma.student.findMany({
            where: { schoolId },
            skip: offset,
            take: limit,
            select: {
                id: true,
                name: true,
                email: true,
                classId: true,
                sectionId: true,
            },
        })

        const total = await prisma.student.count({ where: { schoolId } })

        return NextResponse.json({ students, total })
    } catch (error) {
        console.error("[STUDENTS_FETCH_ERROR]", error)
        return NextResponse.json({ error: "Failed to fetch students", errormsg: error }, { status: 500 })
    }
}
