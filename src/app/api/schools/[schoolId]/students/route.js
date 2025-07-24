import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    const { schoolId } = await params // ✅ no await

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const start = performance.now();

        const students = await prisma.student.findMany({
            where: { schoolId },
            select: {
                id: true,
                studentName: true,
                session: true,
                class: {
                    select: { name: true, section: true }
                },
                user: {
                    select: { email: true }
                }
            }
        });

        const end = performance.now();
        console.log(`⏱️ DB query took ${(end - start).toFixed(2)} ms`);

        return NextResponse.json({ students });
    } catch (err) {
        console.error("[GET_STUDENTS]", err);
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }
}
