// app/api/documents/[schoolId]/pdf-settings/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const settings = await prisma.pdfExportSettings.findUnique({
            where: { schoolId },
        });
        return NextResponse.json(settings || {});
    } catch (error) {
        console.error('Error fetching PDF settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await request.json();

        const settings = await prisma.pdfExportSettings.upsert({
            where: { schoolId },
            update: { ...body, updatedAt: new Date() },
            create: { ...body, schoolId },
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error saving PDF settings:', error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}