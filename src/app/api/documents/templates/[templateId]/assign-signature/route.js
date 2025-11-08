// app/api/templates/[templateId]/assign-signature/route.js
import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function POST(request, props) {
    const params = await props.params;
    const { templateId } = params;
    const body = await request.json();
    try {
        if (!templateId) return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
        if (!body.signatureId || !body.x || !body.y) return NextResponse.json({ error: 'Signature ID and position required' }, { status: 400 });

        const assignment = await prisma.templateSignature.create({
            data: { ...body, templateId },
        });
        return NextResponse.json(assignment, { status: 201 });
    } catch (error) {
        console.error('[ASSIGN_SIGNATURE_API_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}