import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const POST = withSchoolAccess(async function POST(req) {
  try {
    const body = await req.json();
    const { paymentId, receiptUrl } = body;

    if (!paymentId || !receiptUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate that payment exists
    const payment = await prisma.feePayment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Update the payment record with the receiptUrl
    await prisma.feePayment.update({
      where: { id: paymentId },
      data: { receiptUrl }
    });

    return NextResponse.json({ success: true, message: "Receipt URL saved successfully." });
  } catch (error) {
    console.error("Save Receipt Error:", error);
    return NextResponse.json(
      { error: "Failed to save receipt URL", details: error.message },
      { status: 500 }
    );
  }
}, { allowPastDueWrite: true });
