import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);

    const schoolId = searchParams.get("schoolId");
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    if (!schoolId) {
        return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });
    }

    const where = {
        schoolId,
        ...(search && {
            OR: [
                { title: { contains: search, mode: "insensitive" } },
                { author: { contains: search, mode: "insensitive" } },
                { ISBN: { contains: search } },
            ],
        }),
        ...(category && { category }),
        ...(status && { status }),

    };

    try {
        const books = await prisma.libraryBook.findMany({
            where,
            include: { school: true, issuedTo: true, reservedBy: true },
            orderBy: {
                createdAt: 'desc', // latest first
            },
        });
        return NextResponse.json(books);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch books" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const data = await req.json(); // App Router way to parse JSON body
        const { title, ISBN, author, publisher, edition, category, status = "available", schoolId } = data;

        if (!title || !ISBN || !author || !publisher || !category || !schoolId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const book = await prisma.libraryBook.create({
            data: { title, ISBN, author, publisher, edition, category, status, schoolId },
        });
        return NextResponse.json(book, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create book" }, { status: 500 });
    }
}
