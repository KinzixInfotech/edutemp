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

        const cacheKey = `library:stats:${schoolId}`;
        const cached = await getCache(cacheKey);

        if (cached) {
            return NextResponse.json(cached);
        }

        // Get total books count
        const totalBooks = await prisma.libraryBook.count({
            where: { schoolId },
        });

        // Get issued books count
        const booksIssued = await prisma.libraryTransaction.count({
            where: {
                schoolId,
                status: "ISSUED",
            },
        });

        // Get pending returns (due this week)
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const pendingReturns = await prisma.libraryTransaction.count({
            where: {
                schoolId,
                status: "ISSUED",
                dueDate: {
                    lte: nextWeek,
                },
            },
        });

        // Get total fines collected this month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const finesCollected = await prisma.libraryTransaction.aggregate({
            where: {
                schoolId,
                finePaid: true,
                issueDate: {
                    gte: startOfMonth,
                },
            },
            _sum: {
                fineAmount: true,
            },
        });

        const stats = {
            totalBooks,
            booksIssued,
            pendingReturns,
            finesCollected: finesCollected._sum.fineAmount || 0,
        };

        await setCache(cacheKey, stats, { ex: 300 }); // Cache for 5 minutes

        return NextResponse.json(stats);
    } catch (error) {
        console.error("Library stats error:", error);
        return NextResponse.json(
            { error: "Failed to fetch library stats", message: error.message },
            { status: 500 }
        );
    }
}
