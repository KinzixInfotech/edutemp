// pages/api/library/books/[id].js

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req, { params }) {
    const { id } = await params; // ✅ await params before accessing id
    try {
        const body = await req.json(); // ✅ parse the body
        const { title, ISBN, author, publisher, edition, category, status } = body;

        const book = await prisma.libraryBook.update({
            where: { id },
            data: { title, ISBN, author, publisher, edition, category, status },
        });

        return NextResponse.json(book); // ✅ return updated book
    } catch (error) {
        console.error("Update error:", error); // ✅ log actual error
        return NextResponse.json({ error: "Failed to update book" }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    const { id } = await params;
    try {
        await prisma.libraryBook.delete({ where: { id } });
        return NextResponse.json({ message: "Book deleted successfully" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}