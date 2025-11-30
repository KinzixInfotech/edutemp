import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;

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

        return NextResponse.json({
            totalBooks,
            totalCopies,
            issuedCopies,
            availableCopies: totalCopies - issuedCopies,
            overdueBooks: overdueTransactions,
            totalFinesCollected: totalFines._sum.fineAmount || 0,
        });
    } catch (error) {
        console.error("Error fetching library stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch stats" },
            { status: 500 }
        );
    }
}
