import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import z from "zod";

const schema = z.object({
    userIds: z.array(z.string()).nonempty(),
    schoolId: z.string(),
    date: z.string().optional().nullable(),   // e.g., "2025-08-26"
    month: z.string().optional().nullable(),  // e.g., "2025-08"
});

export async function GET(req) {
    try {
        const url = new URL(req.url);
        const rawUserIds = url.searchParams.get("userIds") || "";
        const schoolId = url.searchParams.get("schoolId");
        const date = url.searchParams.get("date");
        const month = url.searchParams.get("month");

        const userIds = rawUserIds.split(",").filter(Boolean);

        const { userIds: validatedUserIds, schoolId: validatedSchoolId, date: validatedDate, month: validatedMonth } =
            schema.parse({ userIds, schoolId, date, month });

        // Verify all users belong to the school
        const users = await prisma.user.findMany({
            where: { id: { in: validatedUserIds }, schoolId: validatedSchoolId },
            select: { id: true },
        });

        if (users.length === 0) {
            return NextResponse.json(
                { error: "No valid users found in the specified school" },
                { status: 404 }
            );
        }

        // Build where clause
        let whereClause = { userId: { in: validatedUserIds } };

        if (validatedDate) {
            // Match only the DATE part, ignoring time
            const start = new Date(`${validatedDate}T00:00:00.000Z`);
            const end = new Date(`${validatedDate}T23:59:59.999Z`);
            whereClause.date = { gte: start, lte: end };
        }

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
            select: {
                userId: true,
                date: true,
                status: true,
                user: { select: { profilePicture: true } },
            },
        });

        return NextResponse.json({ attendanceRecords }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
