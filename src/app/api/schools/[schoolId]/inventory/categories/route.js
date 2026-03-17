// app/api/schools/[schoolId]/inventory/categories/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { remember, invalidatePattern } from "@/lib/cache";

const NS = (schoolId) => `inv:${schoolId}`;

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;

        const cacheKey = `${NS(schoolId)}:categories`;

        const categories = await remember(cacheKey, async () => {
            return prisma.inventoryCategory.findMany({
                where: { schoolId },
                include: { _count: { select: { items: true } } },
                orderBy: { name: "asc" },
            });
        }, 120);

        return NextResponse.json(categories);
    } catch (error) {
        console.error("GET /inventory/categories error:", error);
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request, { params }) {
    try {
        const { schoolId } = await params;
        const { name, description } = await request.json();

        if (!name?.trim()) {
            return NextResponse.json({ error: "Category name is required" }, { status: 400 });
        }

        if (name.trim().length > 100) {
            return NextResponse.json({ error: "Category name must be 100 characters or fewer" }, { status: 400 });
        }

        // Check for duplicate name within this school
        const existing = await prisma.inventoryCategory.findFirst({
            where: { schoolId, name: { equals: name.trim(), mode: "insensitive" } },
            select: { id: true },
        });
        if (existing) {
            return NextResponse.json({ error: `Category "${name.trim()}" already exists` }, { status: 409 });
        }

        const category = await prisma.inventoryCategory.create({
            data: {
                schoolId,
                name: name.trim(),
                description: description?.trim() || null,
            },
            include: { _count: { select: { items: true } } },
        });

        // Only invalidate the categories cache — items/stats are not affected
        await invalidatePattern(`${NS(schoolId)}:categories`);

        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        console.error("POST /inventory/categories error:", error);
        return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
    }
}