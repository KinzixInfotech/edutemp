// api to fetch the academic year by class
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
    req,
) {
    try {
        const { id } = params

        const classes = await prisma.class.findMany({
            where: { academicYearId: id },
            include: {
                students: {
                    include: {
                        user: true,
                        section: { select: { name: true } },
                    },
                },
            },
        })

        return NextResponse.json(classes)
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
    }
}
