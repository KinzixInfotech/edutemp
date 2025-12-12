import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;

        const cacheKey = generateKey('library:stats', { schoolId });

        const stats = await remember(cacheKey, async () => {
            const [
                totalBooks,
                totalCopies,
                issuedCopies,
                overdueTransactions,
                totalFines,
            ] = await Promise.all([
                prisma.libraryBook.count({ where: { schoolId } }),
                prisma.libraryBookCopy.count({ where: { book: { schoolId } } }),
                prisma.libraryBookCopy.count({
                    where: { book: { schoolId }, status: "ISSUED" },
                }),
                prisma.libraryTransaction.count({
                    where: {
                        copy: { book: { schoolId } },
                        status: "ISSUED",
                        dueDate: { lt: new Date() },
                    },
                }),
                prisma.libraryTransaction.aggregate({
                    where: {
                        copy: { book: { schoolId } },
                        finePaid: true,
                    },
                    _sum: {
                        fineAmount: true,
                    },
                }),
            ]);

            return {
                totalBooks,
                totalCopies,
                issuedCopies,
                availableCopies: totalCopies - issuedCopies,
                overdueBooks: overdueTransactions,
                totalFinesCollected: totalFines._sum.fineAmount || 0,
            };
        }, 300);

        return NextResponse.json(stats);
    } catch (error) {
        console.error("Error fetching library stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch stats" },
            { status: 500 }
        );
    }
}
