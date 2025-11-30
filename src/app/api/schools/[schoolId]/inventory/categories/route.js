import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: List all categories
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;

        const categories = await prisma.inventoryCategory.findMany({
            where: { schoolId },
            include: {
                _count: {
                    select: { items: true },
                },
            },
            orderBy: { name: "asc" },
        });

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

        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        console.error("Error creating category:", error);
        return NextResponse.json(
            { error: "Failed to create category" },
            { status: 500 }
        );
    }
}
