import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");
        const feeSessionId = searchParams.get("feeSessionId");

        if (!studentId || !feeSessionId) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const logs = await prisma.ledgerAuditLog.findMany({
            where: {
                ledgerEntry: {
                    studentId,
                    feeSessionId,
                }
            },
            include: {
                ledgerEntry: {
                    select: {
                        monthLabel: true,
                        feeComponent: { select: { name: true } }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ success: true, logs });
    } catch (error) {
        console.error("Ledger Audit GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
    }
}
