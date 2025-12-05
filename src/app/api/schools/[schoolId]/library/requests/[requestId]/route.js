import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH - Approve or Reject request
export async function PATCH(req, props) {
  const params = await props.params;
    try {
        const { schoolId, requestId } = params;
        const body = await req.json();
        const { action, approvedBy, pickupDays, rejectionReason } = body;

        if (!action || !approvedBy) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const request = await prisma.libraryBookRequest.findUnique({
            where: { id: requestId },
        });

        if (!request || request.schoolId !== schoolId) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        if (request.status !== "PENDING") {
            return NextResponse.json(
                { error: "Only pending requests can be approved or rejected" },
                { status: 400 }
            );
        }

        let updatedRequest;

        if (action === "APPROVE") {
            // Calculate pickup date (default 3 days from now)
            const days = pickupDays || 3;
            const pickupDate = new Date();
            pickupDate.setDate(pickupDate.getDate() + days);

            updatedRequest = await prisma.libraryBookRequest.update({
                where: { id: requestId },
                data: {
                    status: "APPROVED",
                    approvedBy,
                    approvedDate: new Date(),
                    pickupDate,
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
        } else if (action === "REJECT") {
            updatedRequest = await prisma.libraryBookRequest.update({
                where: { id: requestId },
                data: {
                    status: "REJECTED",
                    rejectedBy: approvedBy,
                    rejectedDate: new Date(),
                    rejectionReason: rejectionReason || "No reason provided",
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
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        return NextResponse.json(updatedRequest);
    } catch (error) {
        console.error("Error updating book request:", error);
        return NextResponse.json(
            { error: "Failed to update book request" },
            { status: 500 }
        );
    }
}

// DELETE - Cancel request (user-initiated)
export async function DELETE(req, props) {
  const params = await props.params;
    try {
        const { schoolId, requestId } = params;

        const request = await prisma.libraryBookRequest.findUnique({
            where: { id: requestId },
        });

        if (!request || request.schoolId !== schoolId) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        if (request.status !== "PENDING" && request.status !== "APPROVED") {
            return NextResponse.json(
                { error: "Only pending or approved requests can be cancelled" },
                { status: 400 }
            );
        }

        const updatedRequest = await prisma.libraryBookRequest.update({
            where: { id: requestId },
            data: {
                status: "CANCELLED",
            },
        });

        return NextResponse.json(updatedRequest);
    } catch (error) {
        console.error("Error cancelling book request:", error);
        return NextResponse.json(
            { error: "Failed to cancel book request" },
            { status: 500 }
        );
    }
}
