import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

// GET: List all categories
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;

        const cacheKey = generateKey('inventory:categories', { schoolId });

        const categories = await remember(cacheKey, async () => {
            return await prisma.inventoryCategory.findMany({
                where: { schoolId },
                include: {
                    _count: {
                        select: { items: true },
                    },
                },
                orderBy: { name: "asc" },
            });
        }, 300);

        return NextResponse.json(categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
        return NextResponse.json(
            { error: "Failed to fetch categories" },
            { status: 500 }
        );
    }
}

// POST: Create category
export async function POST(request, { params }) {
    try {
        const { schoolId } = await params;
        const body = await request.json();
        const { name, description } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Category name is required" },
                { status: 400 }
            );
        }

        const category = await prisma.inventoryCategory.create({
            data: {
                schoolId,
                name,
                description,
            },
        });

        await invalidatePattern(`inventory:categories:*${schoolId}*`);
        await invalidatePattern(`inventory:items:*${schoolId}*`);

        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        console.error("Error creating category:", error);
        return NextResponse.json(
            { error: "Failed to create category" },
            { status: 500 }
        );
    }
}
