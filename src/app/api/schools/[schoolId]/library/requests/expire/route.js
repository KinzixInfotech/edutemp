import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invalidatePattern } from "@/lib/cache";

// POST - Check and expire overdue requests
export const POST = withSchoolAccess(async function POST(req, props) {
  const params = await props.params;
  try {
    const { schoolId } = params;

    // Find all approved requests where pickup date has passed
    const expiredRequests = await prisma.libraryBookRequest.updateMany({
      where: {
        schoolId,
        status: "APPROVED",
        pickupDate: {
          lt: new Date()
        }
      },
      data: {
        status: "EXPIRED"
      }
    });

    await invalidatePattern(`library:requests:*${schoolId}*`);
    return NextResponse.json({
      success: true,
      expiredCount: expiredRequests.count,
      message: `${expiredRequests.count} requests marked as expired`
    });
  } catch (error) {
    console.error("Error expiring requests:", error);
    return NextResponse.json(
      { error: "Failed to expire requests" },
      { status: 500 }
    );
  }
});