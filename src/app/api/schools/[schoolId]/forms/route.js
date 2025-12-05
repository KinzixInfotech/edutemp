import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: List all forms for a school
export async function GET(req, props) {
  const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    try {
        const forms = await prisma.form.findMany({
            where: {
                schoolId,
                ...(category && { category }),
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                _count: {
                    select: { applications: true },
                },
            },
        });

        return NextResponse.json(forms);
    } catch (error) {
        console.error("Error fetching forms:", error);
        return NextResponse.json(
            { error: "Failed to fetch forms" },
            { status: 500 }
        );
    }
}

// POST: Create a new form
export async function POST(req, props) {
  const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json();
        const { title, description, category } = body;

        if (!title) {
            return NextResponse.json(
                { error: "Title is required" },
                { status: 400 }
            );
        }

        const form = await prisma.form.create({
            data: {
                schoolId,
                title,
                description,
                category: category || "GENERAL",
                status: "DRAFT",
                slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
            },
        });

        return NextResponse.json(form);
    } catch (error) {
        console.error("Error creating form:", error);
        return NextResponse.json(
            { error: "Failed to create form" },
            { status: 500 }
        );
    }
}
