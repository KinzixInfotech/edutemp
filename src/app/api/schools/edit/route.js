import { z } from "zod";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Use singleton to prevent connection pool exhaustion

const updateSchema = z.object({
    name: z.string().optional(),
    location: z.string().optional(),
    schoolType: z.string().optional(),
    logo: z.string().nullable().optional(),
    subscriptionType: z.enum(["A", "B", "C"]).optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
    domainMode: z.enum(["tenant", "custom"]).optional(),
    tenantName: z.string().optional(),
    customDomain: z.string().optional(),
});


export async function PUT(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing school ID" }, { status: 400 });
        }

        const body = await req.json();
        const parsed = updateSchema.parse(body);

        const resolvedDomain =
            parsed.domainMode === "tenant"
                ? `${parsed.tenantName?.toLowerCase().replace(/\s+/g, "")}.edubreezy.com`
                : parsed.customDomain;

        const updatedSchool = await prisma.school.update({
            where: { id },
            data: {
                name: parsed.name,
                location: parsed.location,
                type: parsed.schoolType,
                logo: parsed.logo || null,
                subscriptionType: parsed.subscriptionType,
                timezone: parsed.timezone,
                language: parsed.language,
                currentDomain: resolvedDomain,
                customDomain: parsed.domainMode === "custom" ? parsed.customDomain : "",
            },
        });

        return NextResponse.json({ success: true, school: updatedSchool });
    } catch (error) {
        console.error("[SCHOOL_UPDATE]", error);
        return NextResponse.json(
            { success: false, error: error.message || "Update failed" },
            { status: 500 }
        );
    }
}
