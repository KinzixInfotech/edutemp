// /api/attendance/summary?date=YYYY-MM-DD&schoolId=...&classId=...
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const schoolId = searchParams.get("schoolId");
    const classId = searchParams.get("classId");

    if (!dateParam || !schoolId)
        return NextResponse.json({ error: "Date and schoolId required" }, { status: 400 });

    const date = new Date(dateParam);
    const roles = ["STUDENT", "TEACHER", "STAFF"]; // These should match Role names in DB

    const summary = await Promise.all(
        roles.map(async (roleName) => {
            // Construct base where clause for User
            const userWhere = {
                schoolId,
                role: { name: roleName }
            };

            // Apply class filter only if classId is provided, not 'all', and role is STUDENT
            if (classId && classId !== 'all' && roleName === 'STUDENT') {
                userWhere.student = {
                    classId: parseInt(classId)
                };
            }

            // Total users for this role
            const total = await prisma.user.count({
                where: userWhere,
            });

            // Attendance counts for this date
            // Attendance has a 'user' relation. We filter attendance by date, status, and user criteria.
            const attendanceWhere = {
                date,
                user: userWhere
            };

            const present = await prisma.attendance.count({
                where: { ...attendanceWhere, status: "PRESENT" },
            });
            const absent = await prisma.attendance.count({
                where: { ...attendanceWhere, status: "ABSENT" },
            });
            const late = await prisma.attendance.count({
                where: { ...attendanceWhere, status: "LATE" },
            });

            return { role: roleName, total, present, absent, late };
        })
    );

    return NextResponse.json(summary);
}
