import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

// 👉 Create new academic year
export async function POST(req) {
    try {
        const body = await req.json()
        const { name, startDate, endDate, schoolId } = body
        console.log(body);

        if (!name || !startDate || !endDate) {
            return NextResponse.json({ error: "All fields required" }, { status: 400 })
        } else if (!schoolId) {
            return NextResponse.json({ error: "Schoool id is missing" }, { status: 400 })
        }

        const academicYear = await prisma.academicYear.create({
            data: {
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                school: { connect: { id: schoolId } },
                // schoolId: schoolId,
            },
        })

        return NextResponse.json(academicYear)
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: "Failed to create academic year" }, { status: 500 })
    }
}

// 👉 List academic years
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url)
        const schoolId = searchParams.get("schoolId") // optional
        if (!schoolId) {
            return NextResponse.json({ error: "Schoool id is missing" }, { status: 400 })
        }
        const academicYears = await prisma.academicYear.findMany({
            orderBy: { createdAt: "desc" },
            where: schoolId ? { schoolId } : {}, // filter if schoolId exists
        })

        return NextResponse.json(academicYears)
    } catch (err) {
        console.error("Error fetching academic years:", err)
        return NextResponse.json(
            { error: "Failed to fetch academic years" },
            { status: 500 }
        )
    }
}