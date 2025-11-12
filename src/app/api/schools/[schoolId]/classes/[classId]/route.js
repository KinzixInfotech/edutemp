import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(req, props) {
    const params = await props.params;
    const { classId, schoolId } = params

    if (!classId) {
        return NextResponse.json(
            { error: "Missing classId" },
            { status: 400 }
        )
    } else if (!schoolId) {
        return NextResponse.json(
            { error: "Missing schoolId" },
            { status: 400 }
        )
    }

    try {
        const { teacherId } = await req.json()

        if (!teacherId) {
            return NextResponse.json(
                { error: "Missing teachingStaffUserId" },
                { status: 400 }
            )
        }

        // Update only if section belongs to the given school
        // const updated = await prisma.section.updateMany({
        //     where: {
        //         id: parseInt(classId, 10),
        //         schoolId: schoolId,
        //     },
        //     data: { teachingStaffUserId:teacherId },
        // })
        const updated = await prisma.section.update({
            where: {
                schoolId,
                id: parseInt(classId, 10),
            },
            data: {
                teachingStaff: {
                    connect: { userId: teacherId }, // connect teacher to section
                },
            },
        });
        if (updated.count === 0) {
            return NextResponse.json(
                { error: "Section not found for this school" },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("❌ Update section supervisor error:", error)
        return NextResponse.json(
            { error: "Failed to update section supervisor" },
            { status: 500 }
        )
    }
}