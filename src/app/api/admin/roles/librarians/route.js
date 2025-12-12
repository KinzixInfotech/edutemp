import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCache, setCache } from "@/lib/cache";

export async function GET(req) {
    try {
        const CACHE_KEY = "librarians:all";
        const CACHE_TTL = 5 * 60; // 5 minutes

        // Try to get from cache
        const cached = await getCache(CACHE_KEY);
        if (cached) {
            return NextResponse.json(cached);
        }

        // Fetch from database
        const librarians = await prisma.librarian.findMany({
            where: {
                deletedAt: null,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        status: true,
                    },
                },
                school: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Transform data
        const transformedData = librarians.map((lib) => ({
            id: lib.userId,
            name: lib.user.name,
            email: lib.user.email,
            status: lib.user.status,
            school: lib.school,
            permissions: lib.permissions,
            createdAt: lib.createdAt,
        }));

        // Cache the result
        await setCache(CACHE_KEY, transformedData, CACHE_TTL);

        return NextResponse.json(transformedData);
    } catch (error) {
        console.error("Get librarians error:", error);
        return NextResponse.json(
            { error: "Failed to fetch librarians" },
            { status: 500 }
        );
    }
}
