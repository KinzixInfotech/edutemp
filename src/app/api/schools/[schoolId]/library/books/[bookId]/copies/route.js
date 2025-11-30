import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: List all copies of a specific book
export async function GET(request, { params }) {
    try {
        const { bookId } = await params;

        const copies = await prisma.libraryBookCopy.findMany({
            where: { bookId },
            orderBy: { accessionNumber: "asc" },
            include: {
                transactions: {
                    where: { status: "ISSUED" },
                    take: 1,
                    orderBy: { issueDate: "desc" },
                },
            },
        });

        return NextResponse.json(copies);
    } catch (error) {
        console.error("Error fetching copies:", error);
        return NextResponse.json(
            { error: "Failed to fetch copies" },
            { status: 500 }
        );
    }
}

// POST: Add new copies
export async function POST(request, { params }) {
    try {
        const { bookId } = await params;
        const body = await request.json();
        const { count = 1, startAccessionNumber, location, condition } = body;

            // If startAccessionNumber is provided, generate sequential numbers
            // Otherwise, generate random UUID-like or auto-increment logic could be used,
            // but here we'll assume the user provides a starting number or we just use UUIDs if not provided (though accession numbers are usually human readable).
            // For simplicity, let's require accession numbers or generate unique ones based on timestamp if not provided.

        const copiesData = [];
        for (let i = 0; i < count; i++) {
            let accessionNumber
            if (startAccessionNumber) {
                // Try to parse as int and increment, otherwise append suffix
                const numPart = parseInt(startAccessionNumber.replace(/\D/g, ''));
                const prefix = startAccessionNumber.replace(/\d+$/, '');
                if (!isNaN(numPart)) {
                    accessionNumber = `${prefix}${numPart + i}`;
                } else {
                    accessionNumber = `${startAccessionNumber}-${i + 1}`;
                }
            } else {
                accessionNumber = `ACC-${Date.now()}-${i}`;
            }

            copiesData.push({
                bookId,
                accessionNumber,
                location: location || "General Shelf",
                condition: condition || "GOOD",
                status: "AVAILABLE",
            });
        }

        const createdCopies = await prisma.libraryBookCopy.createMany({
            data: copiesData,
            skipDuplicates: true, // In case of collision
        });

        return NextResponse.json(
            { message: "Copies added successfully", count: createdCopies.count },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error adding copies:", error);
        return NextResponse.json(
            { error: "Failed to add copies" },
            { status: 500 }
        );
    }
}
