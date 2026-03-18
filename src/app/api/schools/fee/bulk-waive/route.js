/**
 * API Route: /api/schools/fee/bulk-waive
 * Method: POST
 * Description: Waives the remaining balance for multiple students for a specific fee component/month
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { waiveBalance } from "@/lib/fee/discount-engine";

export async function POST(req) {
    try {
        const body = await req.json();
        const { schoolId, feeSessionId, feeComponentId, classId, sectionId, targetMonth, reason, userId } = body;

        if (!schoolId || !feeSessionId || !feeComponentId) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const actorId = userId || "SYSTEM";
        
        // Find matching ledger entries
        const whereClause = {
            schoolId,
            feeSessionId,
            feeComponentId,
            status: { in: ["LEDGER_UNPAID", "LEDGER_PARTIAL"] }
        };

        if (targetMonth) {
            whereClause.month = new Date(targetMonth);
        }

        if (classId) {
            whereClause.student = {
                classId,
                ...(sectionId && { sectionId })
            };
        }

        const entries = await prisma.studentFeeLedger.findMany({
            where: whereClause,
            select: { id: true }
        });

        const results = { total: entries.length, success: 0, failed: 0 };

        // Process in batches
        for (const entry of entries) {
            try {
                await waiveBalance(entry.id, actorId, reason || "Bulk waive applied");
                results.success++;
            } catch (err) {
                results.failed++;
                console.error(`Failed to bulk waive entry ${entry.id}:`, err.message);
            }
        }

        return NextResponse.json({ success: true, ...results });

    } catch (error) {
        console.error("Bulk Waive Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
