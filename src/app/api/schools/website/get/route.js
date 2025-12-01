import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");

        if (!schoolId) {
            return NextResponse.json({ error: "schoolId required" }, { status: 400 });
        }

        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { websiteConfig: true }
        });

        return NextResponse.json({ config: school?.websiteConfig || {} });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
