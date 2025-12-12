import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCache, setCache } from "@/lib/cache";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");

        if (!schoolId) {
            return NextResponse.json(
                { error: "School ID is required" },
                { status: 400 }
            );
        }

        const cacheKey = `library:due-today:${schoolId}`;
        const cached = await getCache(cacheKey);

        if (cached) {
            return NextResponse.json(cached);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Get books due today and overdue
        const dueBooks = await prisma.libraryTransaction.findMany({
            where: {
                schoolId,
                status: "ISSUED",
                dueDate: {
                    lte: tomorrow,
                },
            },
            include: {
                copy: {
                    include: {
                        book: {
                            select: {
                                title: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                dueDate: "asc",
            },
            take: 10,
        });

        await setCache(cacheKey, dueBooks, { ex: 120 }); // Cache for 2 minutes

        return NextResponse.json(dueBooks);
    } catch (error) {
        console.error("Due books error:", error);
        return NextResponse.json(
            { error: "Failed to fetch due books", message: error.message },
            { status: 500 }
        );
    }
}
