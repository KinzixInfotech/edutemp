import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invalidatePattern } from "@/lib/cache";

// POST - Mark request as collected
export const POST = withSchoolAccess(async function POST(req, props) {
  const params = await props.params;
  try {
    const { schoolId, requestId } = params;
    const body = await req.json();
    const { collectedBy } = body;

    if (!collectedBy) {
      return NextResponse.json(
        { error: "Missing collectedBy field" },
        { status: 400 }
      );
    }

    const request = await prisma.libraryBookRequest.findUnique({
      where: { id: requestId },
      include: {
        book: true
      }
    });

    if (!request || request.schoolId !== schoolId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Only approved requests can be marked as collected" },
        { status: 400 }
      );
    }

    // Check if pickup date has passed
    if (request.pickupDate && new Date() > new Date(request.pickupDate)) {
      // Mark as expired instead
      await prisma.libraryBookRequest.update({
        where: { id: requestId },
        data: {
          status: "EXPIRED"
        }
      });
      return NextResponse.json(
        { error: "Pickup date has passed. Request marked as expired." },
        { status: 400 }
      );
    }

    // Update request status
    const updatedRequest = await prisma.libraryBookRequest.update({
      where: { id: requestId },
      data: {
        status: "COLLECTED",
        collectedDate: new Date(),
        collectedBy
      },
      include: {
        book: {
          select: {
            title: true,
            author: true
          }
        }
      }
    });

    await invalidatePattern(`library:requests:*${schoolId}*`);
    return NextResponse.json({
      success: true,
      request: updatedRequest,
      message: "Request marked as collected successfully"
    });
  } catch (error) {
    console.error("Error marking request as collected:", error);
    return NextResponse.json(
      { error: "Failed to mark request as collected" },
      { status: 500 }
    );
  }
});