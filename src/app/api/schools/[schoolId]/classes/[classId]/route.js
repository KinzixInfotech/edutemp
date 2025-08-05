import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"


export async function PATCH(req,{params}) {
    const { classId, schoolId } = params;

    if (!classId || !schoolId) {
        return NextResponse.json({ error: "Missing classId or schoolId" }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { teachingStaffUserId } = body;

    if (!teachingStaffUserId) {
            return NextResponse.json({ error: "Missing teachingStaffUserId" }, { status: 400 });
        }

        const updatedClass = await prisma.class.update({
            where: {
                id: parseInt(classId, 10),
            },
            data: {
                teachingStaffUserId,
            },
        });

        return NextResponse.json({ success: true, data: updatedClass });
    } catch (error) {
        console.error("❌ Update supervisor error:", error);
        return NextResponse.json({ error: "Failed to update supervisor" }, { status: 500 });
    }
}