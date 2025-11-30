import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request, { params }) {
    try {
        const { schoolId } = await params;
        const body = await request.json();
        const { copyId, userId, userType, dueDate } = body;

        if (!copyId || !userId || !userType || !dueDate) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if copy is available
        const copy = await prisma.libraryBookCopy.findUnique({
            where: { id: copyId },
        });

        if (!copy) {
            return NextResponse.json({ error: "Copy not found" }, { status: 404 });
        }

        if (copy.status !== "AVAILABLE") {
            return NextResponse.json(
                { error: `Copy is currently ${copy.status}` },
                { status: 400 }
            );
        }

        // Start transaction
        const transaction = await prisma.$transaction(async (tx) => {
            // Create transaction record
            const newTransaction = await tx.libraryTransaction.create({
                data: {
                    copyId,
                    userId,
                    userType,
                    issueDate: new Date(),
                    dueDate: new Date(dueDate),
                    status: "ISSUED",
                },
            });

            // Update copy status
            await tx.libraryBookCopy.update({
                where: { id: copyId },
                data: { status: "ISSUED" },
            });

            return newTransaction;
        });

        return NextResponse.json(transaction, { status: 201 });
    } catch (error) {
        console.error("Error issuing book:", error);
        return NextResponse.json(
            { error: "Failed to issue book" },
            { status: 500 }
        );
    }
}
