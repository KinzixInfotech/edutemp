import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

// GET: List all books with filtering and pagination
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const category = searchParams.get("category");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");

        const cacheKey = generateKey('library:books', { schoolId, search, category, page, limit });

        const result = await remember(cacheKey, async () => {
            const skip = (page - 1) * limit;

            const where = {
                schoolId,
                OR: [
                    { title: { contains: search, mode: "insensitive" } },
                    { author: { contains: search, mode: "insensitive" } },
                    { ISBN: { contains: search, mode: "insensitive" } },
                ],
                ...(category && { category }),
            };

            const [books, total] = await Promise.all([
                prisma.libraryBook.findMany({
                    where,
                    include: {
                        copies: true,
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: "desc" },
                }),
                prisma.libraryBook.count({ where }),
            ]);

            // Process books to add availability stats
            const enhancedBooks = books.map((book) => {
                const totalCopies = book.copies.length;
                const availableCopies = book.copies.filter(
                    (c) => c.status === "AVAILABLE"
                ).length;
                return {
                    ...book,
                    totalCopies,
                    availableCopies,
                };
            });

            return {
                data: enhancedBooks,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }, 300);

        // Return data array for backward compatibility
        return NextResponse.json(result.data);
    } catch (error) {
        console.error("Error fetching books:", error);
        return NextResponse.json(
            { error: "Failed to fetch books" },
            { status: 500 }
        );
    }
}

// POST: Create a new book
export async function POST(request, { params }) {
    try {
        const { schoolId } = await params;
        const body = await request.json();
        const { title, author, ISBN, category, publisher, edition, description, coverImage } = body;

        if (!title || !author || !ISBN) {
            return NextResponse.json(
                { error: "Title, Author, and ISBN are required" },
                { status: 400 }
            );
        }

        const existingBook = await prisma.libraryBook.findFirst({
            where: { schoolId, ISBN },
        });

        if (existingBook) {
            return NextResponse.json(
                { error: "Book with this ISBN already exists" },
                { status: 409 }
            );
        }

        const newBook = await prisma.libraryBook.create({
            data: {
                schoolId,
                title,
                author,
                ISBN,
                category: category || "General",
                publisher: publisher || "Unknown",
                edition,
                description,
                coverImage,
            },
        });

        await invalidatePattern(`library:books:*${schoolId}*`);
        await invalidatePattern(`library:stats:*${schoolId}*`);

        return NextResponse.json(newBook, { status: 201 });
    } catch (error) {
        console.error("Error creating book:", error);
        return NextResponse.json(
            { error: "Failed to create book" },
            { status: 500 }
        );
    }
}
