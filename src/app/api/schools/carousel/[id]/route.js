import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { delCache, generateKey } from '@/lib/cache';

export async function DELETE(request, { params }) {
    try {
        const { id } = params;

        // Use await params if necessary in newer Next.js versions, but destructuring usually works for now via the context
        // Check if ID exists first to get the schoolId for cache clearing
        const image = await prisma.schoolCarouselImage.findUnique({
            where: { id },
            select: { schoolId: true }
        });

        if (!image) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // Delete the image
        await prisma.schoolCarouselImage.delete({
            where: { id }
        });

        // Invalidate cache
        const cacheKey = generateKey('school_carousel', { schoolId: image.schoolId });
        await delCache(cacheKey);

        return NextResponse.json({ success: true, message: 'Image deleted' });
    } catch (error) {
        console.error('Error deleting carousel image:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
