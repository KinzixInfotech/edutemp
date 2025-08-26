// import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import z from "zod";
import { startOfMonth, endOfMonth } from "date-fns";
import prisma from "@/lib/prisma";

const schema = z.object({
    userIds: z.array(z.string()), // Array of userIds
    month: z.string().datetime(), // ISO date like 2025-08-01T00:00:00Z
});

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const rawUserIds = searchParams.get("userIds") || "";
        const userIds = rawUserIds.split(",").filter(Boolean);
        const dateParam = searchParams.get("date"); // pass date from frontend
        if (!dateParam) throw new Error("Date is required");

        const start = new Date(dateParam);
        const end = new Date(dateParam);

        const attendances = await prisma.attendance.findMany({
            where: {
                userId: { in: userIds },
                date: {
                    gte: start,
                    lte: end,
                },
            },
            select: {
                userId: true,
                date: true,
                status: true,
                user: { select: { profilePicture: true } },
            },
        });

        return NextResponse.json(attendances);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
