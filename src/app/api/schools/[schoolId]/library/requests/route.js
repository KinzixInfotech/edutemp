import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";
import { getPagination, paginate } from "@/lib/api-utils";

// GET - List all book requests
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const userId = searchParams.get("userId");
        const bookId = searchParams.get("bookId");
        const { page, limit } = getPagination(req);

        const cacheKey = generateKey('library:requests', { schoolId, status, userId, bookId, page, limit });

        const result = await remember(cacheKey, async () => {
            const skip = (page - 1) * limit;
            const where = {
                schoolId: schoolId,
                ...(status && { status }),
                ...(userId && { userId }),
                ...(bookId && { bookId }),
            };

            const [requests, total] = await Promise.all([
                prisma.libraryBookRequest.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        book: {
                            select: {
                                id: true,
                                title: true,
                                author: true,
                                ISBN: true,
                                category: true,
                                coverImage: true,
                                copies: {
                                    where: { status: 'AVAILABLE' },
                                    select: {
                                        id: true,
                                        accessionNumber: true,
                                        barcode: true,
                                        condition: true
                                    }
                                }
                            },
                        },
                        copy: {
                            select: {
                                id: true,
                                accessionNumber: true,
                                barcode: true,
                                condition: true,
                            },
                        },
                    },
                    orderBy: {
                        requestDate: "desc",
                    },
                }),
                prisma.libraryBookRequest.count({ where })
            ]);

            // Fetch user details for all requests
            const userIds = [...new Set(requests.map((r) => r.userId))];
            const users = await prisma.user.findMany({
                where: {
                    id: {
                        in: userIds,
                    },
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    profilePicture: true,
                },
            });

            const userMap = {};
            users.forEach((user) => {
                userMap[user.id] = user;
            });

            // Enrich requests with user data
            const enrichedRequests = requests.map((request) => ({
                ...request,
                user: userMap[request.userId] || {
                    id: request.userId,
                    name: "Unknown User",
                    email: null,
                    profilePicture: null,
                },
            }));

            return {
                data: enrichedRequests,
                total,
                pagination: {
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };
        }, 300);

        // Return data array directly for backward compatibility
        return NextResponse.json(result.data);
    } catch (error) {
        console.error("Error fetching book requests:", error);
        return NextResponse.json(
            { error: "Failed to fetch book requests" },
            { status: 500 }
        );
    }
}

// POST - Create new book request
export async function POST(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await req.json();
        const { bookId, userId, userType, remarks } = body;

        if (!bookId || !userId || !userType) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if book exists and has available copies
        const book = await prisma.libraryBook.findUnique({
            where: { id: bookId },
            include: {
                copies: {
                    where: {
                        status: "AVAILABLE",
                    },
                },
            },
        });

        if (!book) {
            return NextResponse.json({ error: "Book not found" }, { status: 404 });
        }

        // Check if user already has a pending or approved request for this book
        const existingRequest = await prisma.libraryBookRequest.findFirst({
            where: {
                bookId,
                userId,
                status: {
                    in: ["PENDING", "APPROVED"],
                },
            },
        });

        if (existingRequest) {
            return NextResponse.json(
                {
                    error: "You already have a pending or approved request for this book",
                },
                { status: 400 }
            );
        }

        // Create the request
        const request = await prisma.libraryBookRequest.create({
            data: {
                schoolId,
                bookId,
                userId,
                userType,
                remarks,
                status: "PENDING",
            },
            include: {
                book: {
                    select: {
                        title: true,
                        author: true,
                    },
                },
            },
        });

        await invalidatePattern(`library:requests:*${schoolId}*`);

        return NextResponse.json(request, { status: 201 });
    } catch (error) {
        console.error("Error creating book request:", error);
        return NextResponse.json(
            { error: "Failed to create book request" },
            { status: 500 }
        );
    }
}
