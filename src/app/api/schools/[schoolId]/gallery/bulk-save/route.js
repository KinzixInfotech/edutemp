import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/schools/[schoolId]/gallery/bulk-save
 * 
 * Saves all uploaded gallery images to DB in ONE transaction.
 * Called after all files have been uploaded to UploadThing.
 * 
 * Body: {
 *   albumId: string,
 *   uploadedById: string,
 *   files: [{ url, fileName, fileSize, mimeType }]
 * }
 */
export async function POST(request, { params }) {
    try {
        const { schoolId } = await params;
        const { albumId, uploadedById, files } = await request.json();

        if (!albumId || !uploadedById || !files?.length) {
            return NextResponse.json(
                { error: 'albumId, uploadedById, and files are required' },
                { status: 400 }
            );
        }

        // Get settings once for approval status
        const settings = await prisma.gallerySettings.findUnique({
            where: { schoolId },
        });

        const approvalStatus = settings?.requireApproval ? 'PENDING' : 'APPROVED';
        const totalSize = files.reduce((sum, f) => sum + (f.fileSize || 0), 0);

        // Check quota before saving
        if (settings && settings.storageUsed + totalSize > settings.storageQuota) {
            return NextResponse.json(
                { error: 'QUOTA_EXCEEDED', message: 'Storage quota would be exceeded' },
                { status: 400 }
            );
        }

        // Single transaction: create all image records + update album count + update storage
        const result = await prisma.$transaction(async (tx) => {
            // Create all gallery image records in bulk
            const createdImages = await tx.galleryImage.createMany({
                data: files.map((file) => ({
                    albumId,
                    schoolId,
                    originalUrl: file.url,
                    optimizedUrl: file.url,
                    thumbnailUrl: file.url,
                    fileName: file.fileName,
                    fileSize: file.fileSize || 0,
                    optimizedSize: file.fileSize || 0,
                    mimeType: file.mimeType || 'image/webp',
                    uploadedById,
                    processingStatus: 'COMPLETED',
                    approvalStatus,
                })),
            });

            // Update album image count
            await tx.galleryAlbum.update({
                where: { id: albumId },
                data: { imageCount: { increment: files.length } },
            });

            // Update storage quota
            await tx.gallerySettings.upsert({
                where: { schoolId },
                update: { storageUsed: { increment: totalSize } },
                create: { schoolId, storageUsed: totalSize },
            });

            return { count: createdImages.count };
        });

        return NextResponse.json({
            success: true,
            savedCount: result.count,
            totalSize,
        });
    } catch (error) {
        console.error('Bulk save error:', error);
        return NextResponse.json(
            { error: 'Failed to save images', message: error.message },
            { status: 500 }
        );
    }
}
