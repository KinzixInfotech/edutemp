import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

// 👉 Create new academic year
export async function POST(req) {
    try {
        const body = await req.json()
        const { name, startDate, endDate, schoolId } = body

        if (!name || !startDate || !endDate) {
            return NextResponse.json({ error: "All fields required" }, { status: 400 })
        } else if (!schoolId) {
            return NextResponse.json({ error: "All fields required" }, { status: 400 })
        }

        const academicYear = await prisma.academicYear.create({
            data: {
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            },
        })

        return NextResponse.json(academicYear)
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: "Failed to create academic year" }, { status: 500 })
    }
}

// 👉 List academic years
export async function GET() {
    try {
        const academicYears = await prisma.academicYear.findMany({
            orderBy: { createdAt: "desc" },
        })
        return NextResponse.json(academicYears)
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: "Failed to fetch academic years" }, { status: 500 })
    }
}
