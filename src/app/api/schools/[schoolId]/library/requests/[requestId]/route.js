import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications/notificationHelper";

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
            const { copyId } = body;

            if (!copyId) {
                return NextResponse.json(
                    { error: "Please select a specific book copy to approve" },
                    { status: 400 }
                );
            }

            // Calculate pickup date (default 3 days from now)
            const days = pickupDays || 3;
            const pickupDate = new Date();
            pickupDate.setDate(pickupDate.getDate() + days);

            // Generate unique 6-character pickup code
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let pickupCode = '';
            for (let i = 0; i < 6; i++) {
                pickupCode += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            // Check if copy is available
            const copy = await prisma.libraryBookCopy.findUnique({
                where: { id: copyId },
            });

            if (!copy || copy.status !== 'AVAILABLE') {
                return NextResponse.json(
                    { error: "Selected copy is no longer available" },
                    { status: 400 }
                );
            }

            // Use transaction to update request and copy
            updatedRequest = await prisma.$transaction(async (tx) => {
                // Update copy status to RESERVED
                await tx.libraryBookCopy.update({
                    where: { id: copyId },
                    data: { status: 'RESERVED' },
                });

                // Update request
                return await tx.libraryBookRequest.update({
                    where: { id: requestId },
                    data: {
                        status: "APPROVED",
                        approvedBy,
                        approvedDate: new Date(),
                        pickupDate,
                        pickupCode,
                        copyId,
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
            });

            // Fetch user FCM token
            const user = await prisma.user.findUnique({
                where: { id: updatedRequest.userId },
                select: { fcmToken: true },
            });

            // Send push notification
            if (user?.fcmToken) {
                await sendNotification({
                    schoolId,
                    title: 'Book Request Approved! 📚',
                    message: `Your request for "${updatedRequest.book.title}" has been approved. Pickup Code: ${pickupCode}. Pickup by ${pickupDate.toLocaleDateString()}.`,
                    type: 'GENERAL',
                    priority: 'NORMAL',
                    targetOptions: { userIds: [updatedRequest.userId] },
                    metadata: { requestId: updatedRequest.id, bookId: updatedRequest.bookId, pickupCode },
                    icon: '📚',
                });
            }
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

            // Fetch user FCM token
            const user = await prisma.user.findUnique({
                where: { id: updatedRequest.userId },
                select: { fcmToken: true },
            });

            // Send push notification
            if (user?.fcmToken) {
                await sendNotification({
                    schoolId,
                    title: 'Book Request Rejected',
                    message: `Your request for "${updatedRequest.book.title}" was not approved. ${rejectionReason || 'Please contact the library.'}`,
                    type: 'GENERAL',
                    priority: 'NORMAL',
                    targetOptions: { userIds: [updatedRequest.userId] },
                    metadata: { requestId: updatedRequest.id, bookId: updatedRequest.bookId, reason: rejectionReason },
                    icon: '❌',
                });
            }
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
