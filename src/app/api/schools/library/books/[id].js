// pages/api/library/books/[id].js

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export default async function handler(req, res) {
    


    const { id } = req.query;

    if (req.method === "PUT") {
        const { title, ISBN, author, publisher, edition, category, status } = req.body;
        try {
            const book = await prisma.libraryBook.update({
                where: { id },
                data: { title, ISBN, author, publisher, edition, category, status },
            });
            return NextResponse.json(book);
        } catch (error) {
            return NextResponse.json({ error: "Failed to update book" }, { status: 500 });
        }
    }

    if (req.method === "DELETE") {
        try {
            await prisma.libraryBook.delete({ where: { id } });
            return NextResponse.json({}, { status: 204 });
        } catch (error) {
            return NextResponse.json({ error: "Failed to delete book" }, { status: 500 });
        }
    }

    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}