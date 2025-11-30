import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req, { params }) {
    try {
        const { schoolId, bookId } = params;

        // Fetch book with all related data
        const book = await prisma.libraryBook.findUnique({
            where: {
                id: bookId,
                schoolId: schoolId,
            },
            include: {
                copies: {
                    orderBy: {
                        accessionNumber: "asc",
                    },
                },
            },
        });

        if (!book) {
            return NextResponse.json({ error: "Book not found" }, { status: 404 });
        }

        // Fetch all transactions for this book's copies
        const copyIds = book.copies.map((copy) => copy.id);
        const transactions = await prisma.libraryTransaction.findMany({
            where: {
                copyId: {
                    in: copyIds,
                },
            },
            include: {
                copy: {
                    select: {
                        accessionNumber: true,
                    },
                },
            },
            orderBy: {
                issueDate: "desc",
            },
        });

        // Fetch user details for transactions
        const userIds = [...new Set(transactions.map((t) => t.userId))];
        const users = await prisma.user.findMany({
            where: {
                id: {
                    in: userIds,
                },
            },
            select: {
                id: true,
                name: true,
                profilePicture: true,
            },
        });

        // Create user map for quick lookup
        const userMap = {};
        users.forEach((user) => {
            userMap[user.id] = user;
        });

        // Enrich transactions with user data
        const enrichedTransactions = transactions.map((transaction) => ({
            ...transaction,
            user: userMap[transaction.userId] || {
                id: transaction.userId,
                name: "Unknown User",
                profilePicture: null,
            },
        }));

        // Calculate stats
        const totalCopies = book.copies.length;
        const availableCopies = book.copies.filter(
            (c) => c.status === "AVAILABLE"
        ).length;
        const issuedCopies = book.copies.filter((c) => c.status === "ISSUED").length;
        const damagedCopies = book.copies.filter(
            (c) => c.status === "DAMAGED"
        ).length;
        const lostCopies = book.copies.filter((c) => c.status === "LOST").length;

        // Calculate total fines collected for this book
        const totalFines = transactions.reduce(
            (sum, t) => sum + (t.finePaid ? t.fineAmount : 0),
            0
        );

        return NextResponse.json({
            book: {
                ...book,
                totalCopies,
                availableCopies,
                issuedCopies,
                damagedCopies,
                lostCopies,
                totalFines,
            },
            transactions: enrichedTransactions,
        });
    } catch (error) {
        console.error("Error fetching book details:", error);
        return NextResponse.json(
            { error: "Failed to fetch book details" },
            { status: 500 }
        );
    }
}
