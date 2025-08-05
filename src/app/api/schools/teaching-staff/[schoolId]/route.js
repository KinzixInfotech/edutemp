import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req, { params }) {
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    if (!schoolId) {
        return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });
    }

    const includeParams = searchParams.get("include")?.split(",") ?? [];

    // Always include "user" by default
    const include = { user: true };

    // Add other includes dynamically
    includeParams.forEach((relation) => {
        if (relation && relation !== "user") {
            include[relation] = true;
        }
    });

    try {
        const staff = await prisma.teachingStaff.findMany({
            where: { schoolId },
            include,
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
