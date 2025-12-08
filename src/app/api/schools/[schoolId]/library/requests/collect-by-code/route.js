import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST - Mark request as collected by pickup code OR book barcode
export async function POST(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await req.json();
        const { pickupCode, collectedBy } = body; // pickupCode input can be either code or barcode

        if (!pickupCode || !collectedBy) {
            return NextResponse.json(
                { error: "Missing scan code or collectedBy" },
                { status: 400 }
            );
        }

        const scanValue = pickupCode.trim(); // The scanned value

        // 1. Try finding request by pickup code
        let request = await prisma.libraryBookRequest.findFirst({
            where: {
                pickupCode: scanValue,
                schoolId: schoolId,
                status: "APPROVED"
            },
            include: {
                book: true,
                copy: true
            }
        });

        // 2. If not found, try finding copy by barcode, then find the approved request for it
        if (!request) {
            const copy = await prisma.libraryBookCopy.findUnique({
                where: { barcode: scanValue }
            });

            if (copy) {
                request = await prisma.libraryBookRequest.findFirst({
                    where: {
                        copyId: copy.id,
                        schoolId: schoolId,
                        status: "APPROVED"
                    },
                    include: {
                        book: true,
                        copy: true
                    }
                });
            }
        }

        if (!request) {
            return NextResponse.json(
                { error: "Invalid pickup code/barcode or no approved request found." },
                { status: 404 }
            );
        }

        // Check if copy is assigned (should be if approved correctly)
        if (!request.copyId) {
            return NextResponse.json(
                { error: "No book copy assigned to this request." },
                { status: 400 }
            );
        }

        // Check expiry
        if (request.pickupDate && new Date() > new Date(request.pickupDate)) {
            await prisma.libraryBookRequest.update({
                where: { id: request.id },
                data: { status: "EXPIRED" }
            });
            // Release copy if expired
            await prisma.libraryBookCopy.update({
                where: { id: request.copyId },
                data: { status: "AVAILABLE" }
            });
            return NextResponse.json(
                { error: "Pickup date expired" },
                { status: 400 }
            );
        }

        // Fetch Library Settings for Issue Days
        const settings = await prisma.librarySettings.findUnique({
            where: { schoolId: schoolId }
        });

        const issueDays = request.userType === 'TEACHER'
            ? (settings?.issueDaysTeacher || 30)
            : (settings?.issueDaysStudent || 14);

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + issueDays);

        // Transaction: Update Request, Update Copy, Create Transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Request
            const updatedReq = await tx.libraryBookRequest.update({
                where: { id: request.id },
                data: {
                    status: "COLLECTED",
                    collectedDate: new Date(),
                    collectedBy,
                }
            });

            // 2. Update Copy Status
            await tx.libraryBookCopy.update({
                where: { id: request.copyId },
                data: { status: "ISSUED" }
            });

            // 3. Create Borrowing Transaction
            const transaction = await tx.libraryTransaction.create({
                data: {
                    schoolId,
                    userId: request.userId,
                    userType: request.userType,
                    copyId: request.copyId,
                    dueDate: dueDate,
                    status: "ISSUED",
                    issueDate: new Date(),
                }
            });

            return { request: updatedReq, transaction };
        });

        return NextResponse.json({
            success: true,
            request: result.request,
            message: `Book collected. Due: ${dueDate.toLocaleDateString()}`
        });

    } catch (error) {
        console.error("Error collecting book:", error);
        return NextResponse.json(
            { error: "Failed to process collection" },
            { status: 500 }
        );
    }
}
