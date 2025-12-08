import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST - Return a book by scanning barcode
export async function POST(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await req.json();
        const { barcode, returnedBy } = body;

        if (!barcode) {
            return NextResponse.json(
                { error: "Barcode is required" },
                { status: 400 }
            );
        }

        // Find copy by barcode
        const copy = await prisma.libraryBookCopy.findUnique({
            where: { barcode: barcode },
            include: { book: true }
        });

        if (!copy) {
            return NextResponse.json(
                { error: "Invalid barcode. Book copy not found." },
                { status: 404 }
            );
        }

        // Find active transaction
        const transaction = await prisma.libraryTransaction.findFirst({
            where: {
                copyId: copy.id,
                status: "ISSUED", // Only active loans
                schoolId: schoolId
            },

        });

        if (!transaction) {
            return NextResponse.json(
                { error: "This book is not currently issued." },
                { status: 400 }
            );
        }

        // Fetch user details manually
        const user = await prisma.user.findUnique({
            where: { id: transaction.userId },
            select: { name: true, userType: true } // Assuming 'role' or similar, but name is main requirement
        });

        // Calculate Fine (Basic Logic)
        const returnDate = new Date();
        let fineAmount = 0;
        if (returnDate > new Date(transaction.dueDate)) {
            const diffTime = Math.abs(returnDate - new Date(transaction.dueDate));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // Fetch fine per day setting
            const settings = await prisma.librarySettings.findUnique({ where: { schoolId } });
            fineAmount = diffDays * (settings?.finePerDay || 5);
        }

        // Transaction
        await prisma.$transaction(async (tx) => {
            // Update Transaction
            await tx.libraryTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: "RETURNED",
                    returnDate: returnDate,
                    fineAmount: fineAmount > 0 ? fineAmount : 0,
                    remarks: fineAmount > 0 ? `Late return. Fine: ${fineAmount}` : null
                }
            });

            // Update Copy Status
            await tx.libraryBookCopy.update({
                where: { id: copy.id },
                data: { status: "AVAILABLE" }
            });

            // Mark original request as completed/archived if needed, 
            // but status=COLLECTED is usually the end of request lifecycle.
        });

        return NextResponse.json({
            success: true,
            message: `Book "${copy.book.title}" returned successfully.`,
            fine: fineAmount > 0 ? fineAmount : null,
            returnedBy: user?.name || "Unknown User"
        });

    } catch (error) {
        console.error("Error returning book:", error);
        return NextResponse.json(
            { error: "Failed to return book" },
            { status: 500 }
        );
    }
}
