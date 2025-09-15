// pages/api/library/issue.js

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export default async function handler(req, res) {
    
  

    if (req.method === "POST") {
        const { bookId, userId, action, dueDateDays = 14, additionalDays = 14 } = req.body;
        try {
            if (action === "issue") {
                const book = await prisma.libraryBook.findUnique({ where: { id: bookId } });
                if (!book || book.status !== "available") {
                    return NextResponse.json({ error: "Book not available" }, { status: 400 });
                }
                const dueAt = new Date();
                dueAt.setDate(dueAt.getDate() + Number(dueDateDays));
                const updatedBook = await prisma.libraryBook.update({
                    where: { id: bookId },
                    data: { status: "issued", issuedToId: userId, issuedAt: new Date(), dueAt },
                });
                return NextResponse.json(updatedBook);
            }

            if (action === "return") {
                const book = await prisma.libraryBook.findUnique({ where: { id: bookId } });
                if (!book || book.status !== "issued") {
                    return NextResponse.json({ error: "Book not issued" }, { status: 400 });
                }
                const now = new Date();
                const fineAmount = book.dueAt && now > book.dueAt ? (now.getTime() - book.dueAt.getTime()) / (1000 * 3600 * 24) * 1 : 0; // $1 per day late
                const updatedBook = await prisma.libraryBook.update({
                    where: { id: bookId },
                    data: { status: "available", issuedToId: null, issuedAt: null, dueAt: null, fineAmount },
                });
                return NextResponse.json(updatedBook);
            }

            if (action === "renew") {
                const book = await prisma.libraryBook.findUnique({ where: { id: bookId } });
                if (!book || book.status !== "issued") {
                    return NextResponse.json({ error: "Book not issued" }, { status: 400 });
                }
                const newDueAt = new Date(book.dueAt);
                newDueAt.setDate(newDueAt.getDate() + Number(additionalDays));
                const updatedBook = await prisma.libraryBook.update({
                    where: { id: bookId },
                    data: { dueAt: newDueAt },
                });
                return NextResponse.json(updatedBook);
            }

            if (action === "reserve") {
                const book = await prisma.libraryBook.findUnique({ where: { id: bookId } });
                if (!book || (book.status !== "available" && book.status !== "issued")) {
                    return NextResponse.json({ error: "Cannot reserve" }, { status: 400 });
                }
                const updatedBook = await prisma.libraryBook.update({
                    where: { id: bookId },
                    data: { status: "reserved", reservedById: userId, reservedAt: new Date() },
                });
                return NextResponse.json(updatedBook);
            }

            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        } catch (error) {
            return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
        }
    }

    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}