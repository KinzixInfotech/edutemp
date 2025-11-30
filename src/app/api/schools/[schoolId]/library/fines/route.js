import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status"); // PAID, UNPAID, ALL
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // Build where clause
        const where = {
            copy: {
                book: {
                    schoolId: schoolId,
                },
            },
            fineAmount: {
                gt: 0,
            },
        };

        if (status === "PAID") {
            where.finePaid = true;
        } else if (status === "UNPAID") {
            where.finePaid = false;
        }

        if (startDate && endDate) {
            where.returnDate = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        // Fetch transactions with fines
        const transactions = await prisma.libraryTransaction.findMany({
            where,
            include: {
                copy: {
                    include: {
                        book: true,
                    },
                },
            },
            orderBy: {
                returnDate: "desc",
            },
        });

        // Calculate stats
        const totalFines = await prisma.libraryTransaction.aggregate({
            where: {
                copy: {
                    book: {
                        schoolId: schoolId,
                    },
                },
                fineAmount: {
                    gt: 0,
                },
            },
            _sum: {
                fineAmount: true,
            },
        });

        const collectedFines = await prisma.libraryTransaction.aggregate({
            where: {
                copy: {
                    book: {
                        schoolId: schoolId,
                    },
                },
                fineAmount: {
                    gt: 0,
                },
                finePaid: true,
            },
            _sum: {
                fineAmount: true,
            },
        });

        const pendingFines = await prisma.libraryTransaction.aggregate({
            where: {
                copy: {
                    book: {
                        schoolId: schoolId,
                    },
                },
                fineAmount: {
                    gt: 0,
                },
                finePaid: false,
            },
            _sum: {
                fineAmount: true,
            },
        });

        return NextResponse.json({
            transactions,
            stats: {
                total: totalFines._sum.fineAmount || 0,
                collected: collectedFines._sum.fineAmount || 0,
                pending: pendingFines._sum.fineAmount || 0,
            },
        });
    } catch (error) {
        console.error("Error fetching fines:", error);
        return NextResponse.json(
            { error: "Failed to fetch fines" },
            { status: 500 }
        );
    }
}

export async function PUT(request, { params }) {
    try {
        const { schoolId } = await params;
        const body = await request.json();
        const { transactionId } = body;

        if (!transactionId) {
            return NextResponse.json(
                { error: "Transaction ID is required" },
                { status: 400 }
            );
        }

        const transaction = await prisma.libraryTransaction.update({
            where: {
                id: transactionId,
            },
            data: {
                finePaid: true,
            },
        });

        return NextResponse.json(transaction);
    } catch (error) {
        console.error("Error updating fine status:", error);
        return NextResponse.json(
            { error: "Failed to update fine status" },
            { status: 500 }
        );
    }
}
