import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Fetch activity categories and activities
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { includeInactive = "false" } = searchParams;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const categories = await prisma.activityCategory.findMany({
            where: {
                schoolId,
                ...(includeInactive === "true" ? {} : { isActive: true })
            },
            include: {
                activities: {
                    where: includeInactive === "true" ? {} : { isActive: true },
                    orderBy: { name: "asc" }
                }
            },
            orderBy: { order: "asc" }
        });

        return NextResponse.json({ categories });
    } catch (err) {
        console.error("Error fetching activities:", err);
        return NextResponse.json(
            { error: "Failed to fetch activities", message: err.message },
            { status: 500 }
        );
    }
}

// POST - Create activity category with optional activities
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { name, description, icon, activities = [] } = body;

    if (!schoolId || !name) {
        return NextResponse.json(
            { error: "schoolId and category name are required" },
            { status: 400 }
        );
    }

    try {
        const category = await prisma.activityCategory.create({
            data: {
                schoolId,
                name,
                description: description || null,
                icon: icon || null,
                activities: {
                    create: activities.map(act => ({
                        name: act.name,
                        description: act.description || null
                    }))
                }
            },
            include: { activities: true }
        });

        return NextResponse.json({
            message: "Activity category created successfully",
            category
        });
    } catch (err) {
        console.error("Error creating activity category:", err);
        if (err.code === "P2002") {
            return NextResponse.json(
                { error: "Category with this name already exists" },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { error: "Failed to create category", message: err.message },
            { status: 500 }
        );
    }
}

// PUT - Update category or add activities
export async function PUT(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { categoryId, activityId, name, description, icon, order, isActive } = body;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        // If activityId is provided, update activity; otherwise update category
        if (activityId) {
            const activity = await prisma.activity.update({
                where: { id: activityId },
                data: {
                    ...(name !== undefined && { name }),
                    ...(description !== undefined && { description }),
                    ...(isActive !== undefined && { isActive })
                }
            });
            return NextResponse.json({ activity });
        }

        if (categoryId) {
            const category = await prisma.activityCategory.update({
                where: { id: categoryId },
                data: {
                    ...(name !== undefined && { name }),
                    ...(description !== undefined && { description }),
                    ...(icon !== undefined && { icon }),
                    ...(order !== undefined && { order }),
                    ...(isActive !== undefined && { isActive })
                }
            });
            return NextResponse.json({ category });
        }

        return NextResponse.json(
            { error: "categoryId or activityId is required" },
            { status: 400 }
        );
    } catch (err) {
        console.error("Error updating:", err);
        return NextResponse.json(
            { error: "Failed to update", message: err.message },
            { status: 500 }
        );
    }
}
