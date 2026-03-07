import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { delCache, generateKey } from '@/lib/cache';
import { deleteFileByUrl } from '@/lib/r2';

export async function DELETE(request, { params }) {
    try {
        const { id } = params;

        // Check if ID exists first to get the schoolId and imageUrl for cleanup
        const image = await prisma.schoolCarouselImage.findUnique({
            where: { id },
            select: { schoolId: true, imageUrl: true }
        });

        if (!image) {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }

        // Delete from UploadThing storage
        if (image.imageUrl) {
            await deleteFileByUrl(image.imageUrl);
        }

        // Delete from database
        await prisma.schoolCarouselImage.delete({
            where: { id }
        });

        // Invalidate cache
        const cacheKey = generateKey('school_carousel', { schoolId: image.schoolId });
        await delCache(cacheKey);

        return NextResponse.json({ success: true, message: 'Image deleted from DB and storage' });
    } catch (error) {
        console.error('Error deleting carousel image:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
