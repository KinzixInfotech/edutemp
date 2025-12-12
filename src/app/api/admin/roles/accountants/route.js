import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCache, setCache } from "@/lib/cache";

export async function GET(req) {
    try {
        const CACHE_KEY = "accountants:all";
        const CACHE_TTL = 5 * 60; // 5 minutes

        // Try to get from cache
        const cached = await getCache(CACHE_KEY);
        if (cached) {
            return NextResponse.json(cached);
        }

        // Fetch from database
        const accountants = await prisma.accountant.findMany({
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
        const transformedData = accountants.map((acc) => ({
            id: acc.userId,
            name: acc.user.name,
            email: acc.user.email,
            status: acc.user.status,
            school: acc.school,
            permissions: acc.permissions,
            createdAt: acc.createdAt,
        }));

        // Cache the result
        await setCache(CACHE_KEY, transformedData, CACHE_TTL);

        return NextResponse.json(transformedData);
    } catch (error) {
        console.error("Get accountants error:", error);
        return NextResponse.json(
            { error: "Failed to fetch accountants" },
            { status: 500 }
        );
    }
}
