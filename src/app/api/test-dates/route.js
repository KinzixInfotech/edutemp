import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const student = await prisma.student.findUnique({
            where: { userId: "e2ae76de-7d15-4642-9988-a76de8ff8c29" },
            select: { name: true, admissionDate: true, class: { select: { className: true } } }
        });
        
        const session = await prisma.feeSession.findFirst({
            where: { schoolId: "1e8605ee-cc02-4217-ba5d-e087e58a8a43", isActive: true } // just get any active
        });

        return NextResponse.json({ student, session });
    } catch (e) {
        return NextResponse.json({ error: e.message });
    }
}
