import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCache, setCache } from "@/lib/cache";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");

        if (!schoolId) {
            return NextResponse.json(
                { error: "School ID is required" },
                { status: 400 }
            );
        }

        const cacheKey = `library:requests:${schoolId}`;
        const cached = await getCache(cacheKey);

        if (cached) {
            return NextResponse.json(cached);
        }

        // Get recent book requests (last 30 days, limit 10)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const requests = await prisma.libraryBookRequest.findMany({
            where: {
                schoolId,
                requestDate: {
                    gte: thirtyDaysAgo,
                },
            },
            include: {
                book: {
                    select: {
                        title: true,
                    },
                },
            },
            orderBy: {
                requestDate: "desc",
            },
            take: 10,
        });

        await setCache(cacheKey, requests, { ex: 120 }); // Cache for 2 minutes

        return NextResponse.json(requests);
    } catch (error) {
        console.error("Book requests error:", error);
        return NextResponse.json(
            { error: "Failed to fetch book requests", message: error.message },
            { status: 500 }
        );
    }
}
