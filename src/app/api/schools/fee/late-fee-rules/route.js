/**
 * API Route: /api/schools/fee/late-fee-rules
 * Method: GET, POST, DELETE
 * Description: CRUD operations for LateFeeRules
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");

        if (!schoolId) {
            return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });
        }

        const rules = await prisma.lateFeeRule.findMany({
            where: { schoolId },
            orderBy: { name: "asc" }
        });

        return NextResponse.json({ success: true, rules });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { id, schoolId, name, type, amount, percentage, graceDays, maxAmount, isActive } = body;

        if (!schoolId || !name || graceDays === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (id) {
            // Update
            const rule = await prisma.lateFeeRule.update({
                where: { id },
                data: { name, type: type || "FIXED", amount, percentage, graceDays, maxAmount, isActive }
            });
            return NextResponse.json({ success: true, rule });
        } else {
            // Create
            const rule = await prisma.lateFeeRule.create({
                data: { schoolId, name, type: type || "FIXED", amount, percentage, graceDays, maxAmount, isActive }
            });
            return NextResponse.json({ success: true, rule });
        }

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

        // Check dependencies
        const linkedComponents = await prisma.feeComponent.count({ where: { lateFeeRuleId: id } });
        if (linkedComponents > 0) {
            return NextResponse.json({ 
                error: "Cannot delete late fee rule. It is linked to active fee components. Deactivate it instead." 
            }, { status: 400 });
        }

        await prisma.lateFeeRule.delete({ where: { id } });

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
