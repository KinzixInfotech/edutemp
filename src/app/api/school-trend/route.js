import prisma from "@/lib/prisma";
import { subMonths, startOfMonth } from "date-fns";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const now = new Date();

        const months = Array.from({ length: 6 }).map((_, i) => {
            const date = subMonths(startOfMonth(now), i);
            return {
                label: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
                start: date,
                end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
            };
        }).reverse();

        const data = await Promise.all(
            months.map(async ({ label, start, end }) => {
                try {
                    const count = await prisma.school.count({
                        where: {
                            createdAt: {
                                gte: start,
                                lte: end,
                            },
                        },
                    });
                    return { date: label, schools: count };
                } catch (err) {
                    console.error(`Failed to count for ${label}:`, err);
                    return { date: label, schools: 0 };
                }
            })
        );

        const current = data[data.length - 1]?.schools ?? 0;
        const previous = data[data.length - 2]?.schools ?? 0;

        const trend = previous === 0
            ? (current > 0 ? 100 : 0)
            : ((current - previous) / previous) * 100;

        return NextResponse.json({
            data,
            trend: Math.round(trend),
            direction: trend > 0 ? "up" : trend < 0 ? "down" : "neutral",
            description: "School registrations for the last 6 months",
            date: now.toDateString(),
        });
    } catch (error) {
        console.error("Error in /api/school-trend:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch school trend",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
