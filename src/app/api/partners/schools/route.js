// app/api/partners/schools/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");

    if (!partnerId) {
        return NextResponse.json(
            { error: "partnerId is required" },
            { status: 400 }
        );
    }

    try {
        const schools = await prisma.partnerSchool.findMany({
            where: { partnerId },
            include: {
                school: {
                    select: {
                        id: true,
                        name: true,
                        domain: true,
                        location: true,
                        contactNumber: true
                    }
                }
            },
            orderBy: { onboardedAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            schools,
            total: schools.length
        });

    } catch (error) {
        console.error("Fetch partner schools error:", error);
        return NextResponse.json(
            { error: "Failed to fetch schools" },
            { status: 500 }
        );
    }
}