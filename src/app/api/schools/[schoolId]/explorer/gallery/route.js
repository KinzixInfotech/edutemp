// Admin API: Manage School Gallery
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;

        const profile = await prisma.schoolPublicProfile.findUnique({
            where: { schoolId },
            select: { id: true }
        });

        if (!profile) {
            return NextResponse.json({ gallery: [] });
        }

        const gallery = await prisma.schoolGallery.findMany({
            where: { profileId: profile.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ gallery });

    } catch (error) {
        console.error('[GALLERY API ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
    }
}

export async function POST(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;
        const body = await req.json();

        const profile = await prisma.schoolPublicProfile.findUnique({
            where: { schoolId },
            select: { id: true }
        });

        if (!profile) {
            return NextResponse.json({ error: 'Public profile not found' }, { status: 404 });
        }

        const item = await prisma.schoolGallery.create({
            data: {
                profileId: profile.id,
                imageUrl: body.imageUrl,
                caption: body.caption
            }
        });

        return NextResponse.json(item);

    } catch (error) {
        console.error('[CREATE GALLERY ITEM ERROR]', error);
        return NextResponse.json({ error: 'Failed to create gallery item' }, { status: 500 });
    }
}

export async function DELETE(req, props) {
    try {
        const { searchParams } = new URL(req.url);
        const itemId = searchParams.get('id');

        await prisma.schoolGallery.delete({
            where: { id: itemId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[DELETE GALLERY ITEM ERROR]', error);
        return NextResponse.json({ error: 'Failed to delete gallery item' }, { status: 500 });
    }
}
