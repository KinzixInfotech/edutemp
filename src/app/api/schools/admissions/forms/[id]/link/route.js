import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { nanoid } from "nanoid";

const linkSchema = z.object({
    id: z.string().uuid(),
});

export async function POST(req, { params }) {
    const validated = linkSchema.parse({ id: params.id });
    try {
        const existing = await prisma.admissionForm.findUnique({
            where: { id: validated.id },
        });
        if (!existing) {
            return NextResponse.json({ error: "Form not found" }, { status: 404 });
        }
        if (existing.slug) {
            return NextResponse.json({ success: true, slug: existing.slug });
        }
        const slug = nanoid(10);
        const updated = await prisma.admissionForm.update({
            where: { id: validated.id },
            data: { slug },
            select: { slug: true },
        });
        return NextResponse.json({ success: true, slug: updated.slug });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}