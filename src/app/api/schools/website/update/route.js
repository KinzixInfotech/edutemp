import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req) {
    try {
        const body = await req.json();
        const { schoolId, ...configData } = body;

        if (!schoolId) {
            return NextResponse.json({ error: "schoolId required" }, { status: 400 });
        }

        // Merge with existing config to avoid data loss if partial update
        const currentSchool = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { websiteConfig: true }
        });

        const newConfig = {
            ...(currentSchool?.websiteConfig || {}),
            ...configData
        };

        await prisma.school.update({
            where: { id: schoolId },
            data: { websiteConfig: newConfig }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
