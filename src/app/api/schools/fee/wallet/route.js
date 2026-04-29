import { withSchoolAccess } from "@/lib/api-auth"; /**
 * API Route: /api/schools/fee/wallet
 * Method: GET, POST
 * Description: View and manual adjustments to student wallet balances
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const GET = withSchoolAccess(async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const schoolId = searchParams.get("schoolId");

    if (!studentId || !schoolId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const wallet = await prisma.studentWallet.findUnique({
      where: { studentId }
    });

    return NextResponse.json({ success: true, balance: wallet?.balance || 0 });

  } catch (error) {
    console.error("Wallet GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withSchoolAccess(async function POST(req) {
  try {
    const body = await req.json();
    const { studentId, schoolId, amount, action, reason, userId } = body;

    if (!studentId || !schoolId || amount === undefined || !action) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const actorId = userId || "SYSTEM";

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.studentWallet.findUnique({ where: { studentId } });

      if (!wallet && action === "DEBIT") {
        throw new Error("Insufficient wallet balance");
      }

      let newBalance = wallet ? wallet.balance : 0;

      if (action === "CREDIT") {
        newBalance += amount;
      } else if (action === "DEBIT") {
        if (newBalance < amount) throw new Error("Insufficient wallet balance");
        newBalance -= amount;
      } else {
        throw new Error("Invalid action. Use CREDIT or DEBIT.");
      }

      const updatedWallet = await tx.studentWallet.upsert({
        where: { studentId },
        create: { studentId, schoolId, balance: newBalance },
        update: { balance: newBalance }
      });

      // We could optionally add a WalletAuditLog model here in the future
      // For now, manual wallet adjustments are rare, mostly handled by overpayments.

      return updatedWallet;
    });

    return NextResponse.json({ success: true, wallet: result });

  } catch (error) {
    console.error("Wallet POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});