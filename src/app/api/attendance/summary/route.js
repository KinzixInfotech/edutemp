// /api/attendance/summary?date=YYYY-MM-DD&schoolId=...&classId=...
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const schoolId = searchParams.get("schoolId");
    const classId = searchParams.get("classId");

    if (!dateParam || !schoolId || !classId)
        return NextResponse.json({ error: "Date, schoolId and classId required" }, { status: 400 });

    const date = new Date(dateParam);

    const roles = ["STUDENT", "TEACHER", "STAFF"];

    const summary = await Promise.all(
         roles.map(async (role) => {
            // Total users for this role in the school/class
            const total = await prisma.user.count({
                where: { role, schoolId, classId },
            });

            // Attendance counts for this date
            const present = await prisma.attendance.count({
                where: { date, status: "PRESENT", user: { role, schoolId, classId } },
            });
            const absent = await prisma.attendance.count({
                where: { date, status: "ABSENT", user: { role, schoolId, classId } },
            });
            const late = await prisma.attendance.count({
                where: { date, status: "LATE", user: { role, schoolId, classId } },
            });

            return { role, total, present, absent, late };
        })
    );

    return NextResponse.json(summary);
}
