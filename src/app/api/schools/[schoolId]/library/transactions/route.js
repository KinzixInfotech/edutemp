import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";
import { getPagination } from "@/lib/api-utils";

// GET - List all library transactions (issued books)
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status"); // e.g., ISSUED, RETURNED, OVERDUE
        const userId = searchParams.get("userId");
        const { page, limit } = getPagination(req);

        const cacheKey = generateKey('library:transactions', { schoolId, status, userId, page, limit });

        const result = await remember(cacheKey, async () => {
            const skip = (page - 1) * limit;
            const where = {
                schoolId: schoolId,
                ...(status && { status }),
                ...(userId && { userId }),
            };

            const [transactions, total] = await Promise.all([
                prisma.libraryTransaction.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        copy: {
                            select: {
                                id: true,
                                accessionNumber: true,
                                barcode: true,
                                condition: true,
                                book: {
                                    select: {
                                        id: true,
                                        title: true,
                                        author: true,
                                        ISBN: true,
                                        category: true,
                                        coverImage: true,
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        issueDate: "desc",
                    },
                }),
                prisma.libraryTransaction.count({ where })
            ]);

            // Fetch user details manually since there's no direct relation in schema for userId in LibraryTransaction
            const userIds = [...new Set(transactions.map((t) => t.userId))];

            let users = [];
            if (userIds.length > 0) {
                users = await prisma.user.findMany({
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
                        role: {
                            select: {
                                name: true
                            }
                        }
                    },
                });
            }

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
                    email: null,
                    profilePicture: null,
                    role: { name: transaction.userType }
                },
            }));

            return {
                transactions: enrichedTransactions,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        }, 300); // Cache for 5 minutes

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching library transactions:", error);
        return NextResponse.json(
            { error: "Failed to fetch transactions" },
            { status: 500 }
        );
    }
}
