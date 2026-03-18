// FILE: app/api/schools/[schoolId]/library/transactions/active/route.js
// Searches currently ISSUED transactions by student name, book title, or accession number

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";

        if (!search || search.length < 2) {
            return NextResponse.json([]);
        }

        // Find ISSUED transactions for this school's books matching search
        const transactions = await prisma.libraryTransaction.findMany({
            where: {
                status: "ISSUED",
                copy: {
                    book: { schoolId },
                    OR: [
                        { accessionNumber: { contains: search, mode: "insensitive" } },
                        { book: { title: { contains: search, mode: "insensitive" } } },
                    ],
                },
            },
            include: {
                copy: {
                    include: {
                        book: { select: { title: true, author: true } },
                    },
                },
            },
            orderBy: { dueDate: "asc" }, // overdue first
            take: 30,
        });

        // Also search by user name — fetch users matching search, then get their active transactions
        const matchingUsers = await prisma.user.findMany({
            where: {
                schoolId,
                name: { contains: search, mode: "insensitive" },
            },
            select: { id: true, name: true },
            take: 20,
        });

        let userNameTransactions = [];
        if (matchingUsers.length > 0) {
            const matchingUserIds = matchingUsers.map(u => u.id);
            userNameTransactions = await prisma.libraryTransaction.findMany({
                where: {
                    status: "ISSUED",
                    userId: { in: matchingUserIds },
                    copy: { book: { schoolId } },
                },
                include: {
                    copy: {
                        include: {
                            book: { select: { title: true, author: true } },
                        },
                    },
                },
                orderBy: { dueDate: "asc" },
                take: 20,
            });
        }

        // Merge and deduplicate by id
        const merged = [...transactions, ...userNameTransactions];
        const seen = new Set();
        const unique = merged.filter(t => {
            if (seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
        });

        // Enrich with user names
        const userIds = [...new Set(unique.map(t => t.userId))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, profilePicture: true },
        });
        const userMap = Object.fromEntries(users.map(u => [u.id, u]));

        const enriched = unique.map(t => ({
            ...t,
            userName: userMap[t.userId]?.name || "Unknown",
            userImage: userMap[t.userId]?.profilePicture || null,
        }));

        return NextResponse.json(enriched);

    } catch (error) {
        console.error("Active transactions search error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}