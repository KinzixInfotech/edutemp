import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import z from "zod";

const schema = z.object({
    userId: z.string(),
    schoolId: z.string(),
    month: z.string().optional().nullable(), // e.g., "2025-08"
});

export async function GET(req) {
    try {
        const url = new URL(req.url);
        const userId = url.searchParams.get("userId");
        const schoolId = url.searchParams.get("schoolId");
        const month = url.searchParams.get("month");

        const { userId: validatedUserId, schoolId: validatedSchoolId, month: validatedMonth } = schema.parse({ userId, schoolId, month });

        // Verify user belongs to the school
        const user = await prisma.user.findFirst({
            where: { id: validatedUserId, schoolId: validatedSchoolId },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found in the specified school" },
                { status: 404 }
            );
        }

        // Build where clause
        let whereClause = { userId: validatedUserId };
        if (validatedMonth) {
            const start = new Date(`${validatedMonth}-01T00:00:00Z`);
            const end = new Date(start);
            end.setMonth(end.getMonth() + 1);

            whereClause.date = { gte: start, lt: end };
        }

        // Fetch attendance
        const attendanceRecords = await prisma.attendance.findMany({
            where: whereClause,
            orderBy: { date: "desc" },
            select: { id: true, date: true, status: true },
        });

        let percentageData = null;
        if (validatedMonth) {
            const [year, monthNum] = validatedMonth.split("-").map(Number);
            const daysInMonth = new Date(year, monthNum, 0).getDate();
            const presentDays = attendanceRecords.filter(r => r.status === "PRESENT").length;
            const percentage = daysInMonth > 0 ? (presentDays / daysInMonth) * 100 : 0;

            // Previous month
            const prevMonthDate = new Date(year, monthNum - 1, 1);
            const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
            const prevStart = new Date(`${prevMonth}-01T00:00:00Z`);
            const prevEnd = new Date(prevStart);
            prevEnd.setMonth(prevEnd.getMonth() + 1);

            const prevMonthRecords = await prisma.attendance.findMany({
                where: { userId: validatedUserId, date: { gte: prevStart, lt: prevEnd } },
                select: { status: true },
            });

            const prevDaysInMonth = new Date(year, monthNum - 1, 0).getDate();
            const prevPresentDays = prevMonthRecords.filter(r => r.status === "PRESENT").length;
            const prevPercentage = prevDaysInMonth > 0 ? (prevPresentDays / prevDaysInMonth) * 100 : 0;

            let trend = null;
            if (prevDaysInMonth > 0) {
                trend = percentage > prevPercentage ? "up" : percentage < prevPercentage ? "down" : "stable";
            }

            percentageData = {
                month: validatedMonth,
                percentage: Number(percentage.toFixed(2)),
                presentDays,
                daysInMonth,
                trend,
                previousPercentage: Number(prevPercentage.toFixed(2)),
            };
        }

        return NextResponse.json({ attendanceRecords, percentageData }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
