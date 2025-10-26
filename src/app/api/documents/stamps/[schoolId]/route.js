// app/api/documents/stamps/[schoolId]/route.js
import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
    const { schoolId } = params;
    try {
        if (!schoolId) return NextResponse.json({ error: 'School ID required' }, { status: 400 });
        const stamps = await prisma.stamp.findMany({
            where: { schoolId },
        });
        return NextResponse.json(stamps);
    } catch (error) {
        console.error('[STAMP_API_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    const { schoolId } = params;
    const body = await request.json();
    try {
        if (!schoolId) return NextResponse.json({ error: 'School ID required' }, { status: 400 });
        if (!body.name || !body.imageUrl) return NextResponse.json({ error: 'Name and imageUrl required' }, { status: 400 });
        const stamp = await prisma.stamp.create({
            data: { ...body, schoolId },
        });
        return NextResponse.json(stamp, { status: 201 });
    } catch (error) {
        console.error('[STAMP_API_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}