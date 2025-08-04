import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req, { params }) {
    const { schoolId } = params;

    if (!schoolId) {
        return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });
    }

    try {
        const staff = await prisma.teachingStaff.findMany({
            where: { schoolId },
            include: {
                user: true,
                // department: true,
                // subjects: true,
                // Class: true,
            },
        });

        return NextResponse.json({ success: true, data: staff });
    } catch (error) {
        console.error("❌ Fetch teaching staff error:", error);
        return NextResponse.json(
            { error: "Failed to fetch teaching staff" },
            { status: 500 }
        );
    }
}
