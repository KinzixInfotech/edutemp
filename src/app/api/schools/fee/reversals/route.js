/**
 * API Route: /api/schools/fee/reversals
 * Method: POST
 * Description: Refund/Revert a complete payment and unfreeze ledger entries
 */

import { NextResponse } from "next/server";
import { reversePayment } from "@/lib/fee/payment-engine";

export async function POST(req) {
    try {
        const body = await req.json();
        const { paymentId, reason, userId } = body;

        if (!paymentId || !reason) {
            return NextResponse.json({ error: "paymentId and reason are required" }, { status: 400 });
        }

        const actorId = userId || "SYSTEM";

        const result = await reversePayment(paymentId, actorId, reason);

        return NextResponse.json({ success: true, ...result });

    } catch (error) {
        console.error("Reversal POST Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
