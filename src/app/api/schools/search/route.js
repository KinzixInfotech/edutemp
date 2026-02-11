import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
        return NextResponse.json({ schools: [] });
    }

    try {
        if (process.env.NODE_ENV !== "production") {
            console.log(`[schools/search] query: "${query}"`);
        }

        const schools = await prisma.school.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { location: { contains: query, mode: "insensitive" } },
                    { schoolCode: { contains: query, mode: "insensitive" } },
                ],
            },
            select: {
                id: true,
                name: true,
                schoolCode: true,
                location: true,
                profilePicture: true,
            },
            take: 20,
            orderBy: { name: "asc" },
        });

        if (process.env.NODE_ENV !== "production") {
            console.log(`[schools/search] found ${schools.length} results for "${query}"`);
        }

        return NextResponse.json({ schools });
    } catch (err) {
        console.error("Error searching schools:", err);
        return NextResponse.json({ error: "Failed to search schools" }, { status: 500 });
    }
}
