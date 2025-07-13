// File: src/app/api/schools/[schoolId]/students/route.js
import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function GET(req, context) {
    const { schoolId } = context.params

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 })
    }

    try {
        const students = await prisma.student.findMany({
            where: { schoolId },
            include: {
                user: {
                    select: {
                        email: true,
                    },
                },
                class: {
                    select: {
                        name: true,
                        section: true,
                    },
                },
            },
            orderBy: {
                studentName: 'asc',
            },
        })

        return NextResponse.json({ students })
    } catch (error) {
        console.error("[GET_STUDENTS]", error)
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
    }
}
