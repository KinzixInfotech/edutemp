import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// app/api/schools/[schoolId]/teachers/[userId]/route.js
export async function GET(req, props) {
  const params = await props.params;
    const { schoolId, userId } = params;


    // Fetch all sections assigned to this teacher
    const allSections = await prisma.section.findMany({
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

    if (!allSections || allSections.length === 0) {
        return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Filter to only sections whose class actually has students enrolled
    // This avoids returning stale sections from old/duplicate class sets
    const classIds = [...new Set(allSections.map(s => s.classId))];
    const classesWithStudents = await prisma.student.groupBy({
        by: ['classId'],
        where: {
            schoolId,
            classId: { in: classIds },
            user: { deletedAt: null, status: 'ACTIVE' },
        },
        _count: { userId: true },
    });

    const activeClassIds = new Set(classesWithStudents.map(c => c.classId));
    const teacher = activeClassIds.size > 0
        ? allSections.filter(s => activeClassIds.has(s.classId))
        : allSections; // Fallback to all if no students found anywhere

    return NextResponse.json({ teacher });
}
