import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// app/api/schools/[schoolId]/teachers/[userId]/route.js
export async function GET(req, props) {
  const params = await props.params;
    const { schoolId, userId } = params;


    const teacher = await prisma.section.findMany({
        where: {
            schoolId,
            teachingStaff: {
                userId: userId,
            },
        },
        include: {
            class: true,          // parent class info
            teachingStaff: true,  // teacher info
        },
    });
    if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    return NextResponse.json({ teacher });
}
