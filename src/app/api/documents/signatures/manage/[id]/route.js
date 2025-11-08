// app/api/signatures/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function PUT(request, props) {
    const params = await props.params;
    const { id } = params;
    const body = await request.json();
    try {
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
        const signature = await prisma.signature.update({
            where: { id },
            data: body,
        });
        return NextResponse.json(signature);
    } catch (error) {
        console.error('[SIGNATURE_API_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request, props) {
    const params = await props.params;
    const { id } = params;
    try {
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
        await prisma.signature.delete({
            where: { id },
        });
        return NextResponse.json({ message: 'Deleted' });
    } catch (error) {
        console.error('[SIGNATURE_API_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}