// app/api/schools/[schoolId]/parents/[parentId]/library/route.js
// Parent Library API - Get child's borrowed books, fines, and requests
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, parentId } = params;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    try {
        // Verify parent exists
        const parent = await prisma.parent.findUnique({
            where: { id: parentId },
            select: { userId: true, schoolId: true },
        });

        if (!parent || parent.schoolId !== schoolId) {
            return NextResponse.json(
                { error: "Parent not found or unauthorized" },
                { status: 404 }
            );
        }

        // If studentId provided, verify parent-child link
        if (studentId) {
            const link = await prisma.studentParentLink.findFirst({
                where: { parentId, studentId, isActive: true },
            });
            if (!link) {
                return NextResponse.json(
                    { error: "Child not linked to parent" },
                    { status: 403 }
                );
            }
        }

        // Get library settings for fine calculation
        const librarySettings = await prisma.librarySettings.findUnique({
            where: { schoolId },
        });

        const finePerDay = librarySettings?.finePerDay || 5;
        const currency = librarySettings?.currency || "INR";

        // Get borrowed books (active transactions)
        const transactions = await prisma.libraryTransaction.findMany({
            where: {
                userId: studentId,
                status: { in: ["ISSUED", "OVERDUE"] },
            },
            include: {
                copy: {
                    include: {
                        book: {
                            select: {
                                id: true,
                                title: true,
                                author: true,
                                category: true,
                                coverImage: true,
                                ISBN: true,
                            },
                        },
                    },
                },
            },
            orderBy: { dueDate: "asc" },
        });

        // Calculate overdue and fines
        const today = new Date();
        const borrowedBooks = transactions.map((txn) => {
            const dueDate = new Date(txn.dueDate);
            const isOverdue = today > dueDate && !txn.returnDate;
            const daysOverdue = isOverdue
                ? Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24))
                : 0;
            const calculatedFine = daysOverdue * finePerDay;

            return {
                transactionId: txn.id,
                book: txn.copy.book,
                accessionNumber: txn.copy.accessionNumber,
                issueDate: txn.issueDate,
                dueDate: txn.dueDate,
                isOverdue,
                daysOverdue,
                fineAmount: txn.fineAmount > 0 ? txn.fineAmount : calculatedFine,
                finePaid: txn.finePaid,
                status: isOverdue ? "OVERDUE" : txn.status,
            };
        });

        // Get pending book requests
        const pendingRequests = await prisma.libraryBookRequest.findMany({
            where: {
                userId: studentId,
                status: { in: ["PENDING", "APPROVED"] },
            },
            include: {
                book: {
                    select: {
                        id: true,
                        title: true,
                        author: true,
                        coverImage: true,
                    },
                },
            },
            orderBy: { requestDate: "desc" },
        });

        // Get past returns (history) - last 10
        const returnHistory = await prisma.libraryTransaction.findMany({
            where: {
                userId: studentId,
                status: "RETURNED",
            },
            include: {
                copy: {
                    include: {
                        book: {
                            select: {
                                id: true,
                                title: true,
                                author: true,
                                coverImage: true,
                            },
                        },
                    },
                },
            },
            orderBy: { returnDate: "desc" },
            take: 10,
        });

        // Calculate totals
        const totalFinesDue = borrowedBooks
            .filter(b => !b.finePaid && b.fineAmount > 0)
            .reduce((sum, b) => sum + b.fineAmount, 0);

        const overdueCount = borrowedBooks.filter(b => b.isOverdue).length;

        return NextResponse.json({
            borrowedBooks,
            pendingRequests,
            returnHistory: returnHistory.map(txn => ({
                transactionId: txn.id,
                book: txn.copy.book,
                issueDate: txn.issueDate,
                returnDate: txn.returnDate,
                fineAmount: txn.fineAmount,
                finePaid: txn.finePaid,
            })),
            summary: {
                totalBorrowed: borrowedBooks.length,
                overdueCount,
                totalFinesDue,
                pendingRequestsCount: pendingRequests.length,
            },
            settings: {
                finePerDay,
                currency,
                maxBooks: librarySettings?.maxBooksStudent || 3,
                issueDays: librarySettings?.issueDaysStudent || 14,
            },
        });
    } catch (error) {
        console.error("[PARENT_LIBRARY_GET]", error);
        return NextResponse.json(
            { error: "Failed to fetch library data" },
            { status: 500 }
        );
    }
}
