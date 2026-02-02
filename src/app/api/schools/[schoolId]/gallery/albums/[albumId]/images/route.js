import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/schools/[schoolId]/gallery/albums/[albumId]/images - Add image to album
export async function POST(request, { params }) {
    try {
        const { schoolId, albumId } = await params;
        const body = await request.json();
        const { originalUrl, uploadedById, caption } = body;

        if (!originalUrl) {
            return NextResponse.json(
                { error: "Image URL is required" },
                { status: 400 }
            );
        }

        // Verify album exists
        const album = await prisma.galleryAlbum.findFirst({
            where: {
                id: albumId,
                schoolId,
                deletedAt: null,
            },
        });

        if (!album) {
            return NextResponse.json(
                { error: "Album not found" },
                { status: 404 }
            );
        }

        // Get school gallery settings to check approval requirement
        const settings = await prisma.gallerySettings.findUnique({
            where: { schoolId },
        });

        // Extract filename from URL or use default
        const urlParts = originalUrl.split('/');
        const extractedFileName = urlParts[urlParts.length - 1] || `gallery-${Date.now()}.jpg`;

        // Create the gallery image
        const image = await prisma.galleryImage.create({
            data: {
                schoolId,
                albumId,
                originalUrl,
                thumbnailUrl: originalUrl, // Use same URL until processed
                fileName: extractedFileName,
                fileSize: 0, // Will be updated if needed
                mimeType: 'image/jpeg', // Default, already validated by FileUploadButton
                caption: caption || null,
                uploadedById,
                approvalStatus: settings?.requireApproval ? 'PENDING' : 'APPROVED',
                processingStatus: 'COMPLETED', // Already processed via FileUploadButton
            },
        });

        // Update album image count
        await prisma.galleryAlbum.update({
            where: { id: albumId },
            data: {
                imageCount: { increment: 1 },
                // Set as cover image if album has no cover
                ...(album.coverImage ? {} : { coverImage: originalUrl }),
            },
        });

        return NextResponse.json({ image }, { status: 201 });
    } catch (error) {
        console.error("POST /api/schools/[schoolId]/gallery/albums/[albumId]/images error:", error);
        return NextResponse.json(
            { error: "Failed to add image to album" },
            { status: 500 }
        );
    }
}

// GET /api/schools/[schoolId]/gallery/albums/[albumId]/images - Get album images
export async function GET(request, { params }) {
    try {
        const { schoolId, albumId } = await params;
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "24");
        const status = searchParams.get("status") || "APPROVED";

        const imageWhere = {
            albumId,
            isActive: true,
        };

        if (status !== "ALL") {
            imageWhere.approvalStatus = status;
        }

        const [images, total] = await Promise.all([
            prisma.galleryImage.findMany({
                where: imageWhere,
                orderBy: { uploadedAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    uploadedBy: {
                        select: { id: true, name: true, profilePicture: true },
                    },
                },
            }),
            prisma.galleryImage.count({ where: imageWhere }),
        ]);

        return NextResponse.json({
            images,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("GET /api/schools/[schoolId]/gallery/albums/[albumId]/images error:", error);
        return NextResponse.json(
            { error: "Failed to fetch images" },
            { status: 500 }
        );
    }
}
