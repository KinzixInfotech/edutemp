// File: /app/api/schools/[schoolId]/classes/[classId]/sections/route.js
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
export async function POST(req, { params }) {
    try {
        const { schoolId, classId } = params
        const { name } = await req.json()

        if (!name || !schoolId || !classId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // ✅ Create Section
        const newSection = await prisma.section.create({
            data: {
                name: name.toUpperCase(),
                schoolId,
                classId: Number(classId),
            },
        })

        return NextResponse.json({ success: true, section: newSection }, { status: 201 })
    } catch (err) {
        console.error("[SECTION_CREATE]", err)
        return NextResponse.json({ error: "Server error" }, { status: 500 })
    }
}