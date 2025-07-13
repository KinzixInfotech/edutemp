import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

export async function GET(req, { params }) {
    const { schoolId } = params
    console.log(schoolId);
    try {
        const students = await prisma.student.findMany({
            where: { schoolId },
        })

        return NextResponse.json(students)
    } catch (error) {
        console.error("[STUDENTS_FETCH_ERROR]", error)
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
    }
}
