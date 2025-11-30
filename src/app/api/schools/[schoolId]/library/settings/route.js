import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Fetch library settings
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;

        let settings = await prisma.librarySettings.findUnique({
            where: { schoolId },
        });

        // Create default settings if not exists
        if (!settings) {
            settings = await prisma.librarySettings.create({
                data: {
                    schoolId,
                    maxBooksStudent: 3,
                    maxBooksTeacher: 5,
                    issueDaysStudent: 14,
                    issueDaysTeacher: 30,
                    finePerDay: 5,
                    currency: "INR",
                },
            });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error("Error fetching library settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch settings" },
            { status: 500 }
        );
    }
}

// PUT: Update library settings
export async function PUT(request, { params }) {
    try {
        const { schoolId } = await params;
        const body = await request.json();

        const settings = await prisma.librarySettings.upsert({
            where: { schoolId },
            update: body,
            create: {
                schoolId,
                ...body,
            },
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error("Error updating library settings:", error);
        return NextResponse.json(
            { error: "Failed to update settings" },
            { status: 500 }
        );
    }
}
