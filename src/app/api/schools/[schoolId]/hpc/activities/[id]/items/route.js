import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST - Add Activity to Category
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId, id: categoryId } = params; // id is categoryId
    const body = await req.json();
    const { name, description } = body;

    if (!schoolId || !categoryId || !name) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
        const activity = await prisma.activity.create({
            data: {
                categoryId,
                name,
                description: description || null,
                isActive: true
            }
        });

        return NextResponse.json(activity);
    } catch (err) {
        console.error("Error creating activity:", err);
        return NextResponse.json(
            { error: "Failed to create activity", message: err.message },
            { status: 500 }
        );
    }
}
