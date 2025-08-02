// /app/api/school-trend/route.ts (or .js)
import prisma from "@/lib/prisma" // adjust based on your setup
import { subMonths, startOfMonth } from "date-fns"
import { NextResponse } from "next/server"

export async function GET() {
    const now = new Date()

    const months = Array.from({ length: 6 }).map((_, i) => {
        const date = subMonths(startOfMonth(now), i)
        return {
            label: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            start: date,
            end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
        }
    }).reverse()

    const data = await Promise.all(
        months.map(async ({ label, start, end }) => {
            const count = await prisma.school.count({
                where: {
                    createdAt: {
                        gte: start,
                        lte: end,
                    },
                },
            })
            return { date: label, schools: count }
        })
    )

    return NextResponse.json(data)
}
