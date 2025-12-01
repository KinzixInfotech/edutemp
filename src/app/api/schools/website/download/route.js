import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateWebsiteZip } from "@/lib/website-generator";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");

        if (!schoolId) {
            return NextResponse.json({ error: "schoolId required" }, { status: 400 });
        }

        const school = await prisma.school.findUnique({
            where: { id: schoolId },
        });

        if (!school) {
            return NextResponse.json({ error: "School not found" }, { status: 404 });
        }

        const zipBlob = await generateWebsiteZip(school, school.websiteConfig);

        // Convert Blob to Buffer
        const arrayBuffer = await zipBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${school.name.replace(/\s+/g, '_')}_website.zip"`,
            },
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
