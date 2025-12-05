// app/api/schools/[schoolId]/teachers/[userId]/get/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, props) {
  const params = await props.params;
    const { searchParams } = new URL(req.url);
    const detail = searchParams.get("detail") === "true";

    const { schoolId, userId } = params;

    // BASIC FIELDS (no heavy relations)
    const basicSelect = {
        userId: true,
        name: true,
        designation: true,
        gender: true,
        contactNumber: true,
        email: true,
        sectionsAssigned: true,
        Class: true,
        employeeId: true
    };

    // FULL DETAILS (ALL RELATIONS)
    const detailedInclude = {
        department: true,
        school: true,
        AcademicYear: true,
        subjects: true,
        sectionsAssigned: {
            include: {
                class: true,
            },
        },
        Class: true,
        homework: true,
        SectionSubjectTeacher: true,
        user: true,
    };

    const teacher = await prisma.teachingStaff.findUnique({
        where: { userId, schoolId },
        ...(detail
            ? { include: detailedInclude }
            : { select: basicSelect }
        ),
    });

    if (!teacher)
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    return NextResponse.json({ teacher }, { status: 200 });
}
