import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

// GET: List all books with filtering and optional pagination
export const GET = withSchoolAccess(async function GET(request, { params }) {
  try {
    const { schoolId } = await params;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category");
    const hasPage = searchParams.has("page");
    const rawPage = searchParams.get("page");
    const rawLimit = searchParams.get("limit");
    const page = hasPage ? Math.max(1, parseInt(rawPage, 10) || 1) : null;
    const limit = rawLimit ? Math.max(1, parseInt(rawLimit, 10) || 0) : null;

    const sortColumn = searchParams.get("sortColumn");
    const sortDirection = searchParams.get("sortDirection") === "desc" ? "desc" : "asc";
    const shouldPaginate = Boolean(hasPage && limit);
    const shouldLimit = Boolean(limit);
    const validSortColumns = ['title', 'author', 'category', 'createdAt'];
    const validSortColumn = validSortColumns.includes(sortColumn) ? sortColumn : 'createdAt';

    const cacheKey = generateKey('library:books', {
      schoolId,
      search,
      category,
      page,
      limit,
      sortColumn: validSortColumn,
      sortDirection
    });

    const result = await remember(cacheKey, async () => {
      const where = {
        schoolId,
        ...(search && {
          OR: [
          { title: { contains: search, mode: "insensitive" } },
          { author: { contains: search, mode: "insensitive" } },
          { ISBN: { contains: search, mode: "insensitive" } },
          { publisher: { contains: search, mode: "insensitive" } }]

        }),
        ...(category && category !== "all" && { category })
      };

      const queryOptions = {
        where,
        orderBy: { [validSortColumn]: sortDirection },
        select: {
          id: true,
          schoolId: true,
          title: true,
          author: true,
          ISBN: true,
          category: true,
          publisher: true,
          edition: true,
          description: true,
          coverImage: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { copies: true } }
        }
      };

      if (shouldLimit) {
        queryOptions.take = limit;
      }
      if (shouldPaginate) {
        queryOptions.skip = (page - 1) * limit;
      }

      const [books, total] = await Promise.all([
      prisma.libraryBook.findMany(queryOptions),
      shouldPaginate ? prisma.libraryBook.count({ where }) : Promise.resolve(null)]
      );

      const bookIds = books.map((book) => book.id);
      const availableCopiesByBook = bookIds.length > 0 ?
      await prisma.libraryBookCopy.groupBy({
        by: ['bookId'],
        where: {
          bookId: { in: bookIds },
          status: "AVAILABLE"
        },
        _count: {
          _all: true
        }
      }) :
      [];

      const availableCopiesMap = new Map(
        availableCopiesByBook.map((entry) => [entry.bookId, entry._count._all])
      );

      const enhancedBooks = books.map(({ _count, ...book }) => ({
        ...book,
        totalCopies: _count.copies,
        availableCopies: availableCopiesMap.get(book.id) || 0
      }));

      if (shouldPaginate) {
        return {
          data: enhancedBooks,
          total,
          totalPages: Math.ceil(total / limit)
        };
      }

      return enhancedBooks;
    }, 120);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
});

// POST: Create a new book
export const POST = withSchoolAccess(async function POST(request, { params }) {
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
      where: { schoolId, ISBN }
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
        coverImage
      }
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
});