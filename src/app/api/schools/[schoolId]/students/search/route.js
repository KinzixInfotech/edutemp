import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(req, { params }) {
    const { schoolId } = params
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q") || ""

    try {
        const students = await prisma.student.findMany({
            where: {
                schoolId,
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                    { id: { contains: query, mode: "insensitive" } }, // assuming id = admission number
                ]
            },
            select: {
                id: true,
                name: true,
                email: true,
                class: true,
                profilePhoto: true,
            },
            orderBy: {
                name: "asc",
            }
        })

        return NextResponse.json({ students })
    } catch (err) {
        console.error("[STUDENT_SEARCH]", err)
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
    }
}
