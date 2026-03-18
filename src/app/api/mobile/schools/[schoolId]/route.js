import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params; // ← await this

        if (!schoolId) {
            return NextResponse.json({ error: "School ID is required" }, { status: 400 });
        }

        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                id: true,
                name: true,
                profilePicture: true,
                contactNumber: true,
                location: true,
                city: true,
                state: true,
                // removed: pincode (doesn't exist in schema)
            }
        });

        if (!school) {
            return NextResponse.json({ error: "School not found" }, { status: 404 });
        }

        return NextResponse.json(school);
    } catch (error) {
        console.error("Error fetching school details for mobile:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}