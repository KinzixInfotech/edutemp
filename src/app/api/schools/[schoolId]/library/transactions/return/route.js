import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidatePattern } from "@/lib/cache";

export async function POST(request, { params }) {
    try {
        const { schoolId } = await params;
        const body = await request.json();
        const { transactionId, remarks } = body;

        if (!transactionId) {
            return NextResponse.json(
                { error: "Transaction ID is required" },
                { status: 400 }
            );
        }

        // Fetch transaction
        const transaction = await prisma.libraryTransaction.findUnique({
            where: { id: transactionId },
            include: { copy: true },
        });

        if (!transaction) {
            return NextResponse.json(
                { error: "Transaction not found" },
                { status: 404 }
            );
        }

        if (transaction.status === "RETURNED") {
            return NextResponse.json(
                { error: "Book already returned" },
                { status: 400 }
            );
        }

        const returnDate = new Date();
        const dueDate = new Date(transaction.dueDate);
        let fineAmount = 0;

        // Calculate fine if overdue
        if (returnDate > dueDate) {
            const diffTime = Math.abs(returnDate - dueDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Fetch settings for fine amount
            const settings = await prisma.librarySettings.findUnique({
                where: { schoolId },
            });

            const finePerDay = settings?.finePerDay || 5; // Default 5
            fineAmount = diffDays * finePerDay;
        }

        // Execute return transaction
        const updatedTransaction = await prisma.$transaction(async (tx) => {
            // Update transaction
            const updated = await tx.libraryTransaction.update({
                where: { id: transactionId },
                data: {
                    returnDate,
                    status: "RETURNED",
                    fineAmount,
                    remarks,
                },
            });

            // Update copy status
            await tx.libraryBookCopy.update({
                where: { id: transaction.copyId },
                data: { status: "AVAILABLE" },
            });

            return updated;
        });

        await invalidatePattern(`library:*${schoolId}*`);

        return NextResponse.json(updatedTransaction);
    } catch (error) {
        console.error("Error returning book:", error);
        return NextResponse.json(
            { error: "Failed to return book" },
            { status: 500 }
        );
    }
}
