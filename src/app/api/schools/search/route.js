import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

const SEARCH_TTL = 600; // 10 minutes

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
        return NextResponse.json({ schools: [] });
    }

    try {
        const normalized = query.trim().toLowerCase();
        const cacheKey = generateKey("schools:search", normalized);

        const schools = await remember(
            cacheKey,
            async () => {
                if (process.env.NODE_ENV !== "production") {
                    console.log(`[schools/search] CACHE MISS – querying DB for "${query}"`);
                }

                return prisma.school.findMany({
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
            },
            SEARCH_TTL
        );

        return NextResponse.json({ schools });
    } catch (err) {
        console.error("Error searching schools:", err);
        return NextResponse.json({ error: "Failed to search schools" }, { status: 500 });
    }
}
