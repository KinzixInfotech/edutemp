import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

// 👉 Update academic year status
export async function PATCH(req, { params }) {
    const { id } = params
    try {
        const body = await req.json()
        const { isActive } = body

        if (typeof isActive !== "boolean") {
            return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 })
        }

        const year = await prisma.academicYear.findUnique({
            where: { id },
        })

        if (!year) {
            return NextResponse.json({ error: "Academic year not found" }, { status: 404 })
        }

        if (isActive) {
            // Deactivate all other academic years in the same school
            await prisma.academicYear.updateMany({
                where: {
                    schoolId: year.schoolId,
                    NOT: { id: year.id },
                },
                data: { isActive: false },
            })
        }

        const updatedYear = await prisma.academicYear.update({
            where: { id },
            data: { isActive },
        })

        return NextResponse.json(updatedYear)
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: "Failed to update academic year" }, { status: 500 })
    }
}

// 👉 Delete academic year
export async function DELETE(req, { params }) {
    const { id } = params
    try {
        await prisma.academicYear.delete({
            where: { id },
        })

        return NextResponse.json({ message: "Academic year deleted successfully" })
    } catch (err) {
        console.error(err)
        if (err.code === "P2025") {
            return NextResponse.json({ error: "Academic year not found" }, { status: 404 })
        } else if (err.code === "P2003") {
            return NextResponse.json({ error: "Cannot delete academic year with dependencies (e.g., students, classes, fees)" }, { status: 400 })
        }
        return NextResponse.json({ error: "Failed to delete academic year" }, { status: 500 })
    }
}