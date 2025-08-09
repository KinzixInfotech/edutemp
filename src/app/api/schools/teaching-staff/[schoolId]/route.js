import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req, { params }) {
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    if (!schoolId) {
        return NextResponse.json({ error: "Missing schoolId" }, { status: 400 });
    }

    let include = { user: true }; // always include user

    const includeParam = searchParams.get("include");
    if (includeParam) {
        try {
            // Try to parse JSON first
            if (includeParam.trim().startsWith("{")) {
                // If they send something like `?include={"Class":{"include":{"sections":true}}}`
                include = { ...include, ...JSON.parse(includeParam) };
            } else {
                // If they send a comma-separated list like "class,sections"
                includeParam.split(",").forEach((relation) => {
                    if (relation && relation !== "user") {
                        include[relation] = true;
                    }
                });
            }
        } catch (err) {
            console.warn("Invalid include param:", includeParam);
        }
    }

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
