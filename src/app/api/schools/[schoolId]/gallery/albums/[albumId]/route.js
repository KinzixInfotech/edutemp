import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/schools/[schoolId]/gallery/albums/[albumId] - Get single album with images
export async function GET(request, { params }) {
    try {
        const { schoolId, albumId } = await params;
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "30");
        const status = searchParams.get("status") || "APPROVED"; // For admin: can view PENDING

        const album = await prisma.galleryAlbum.findFirst({
            where: {
                id: albumId,
                schoolId,
                deletedAt: null,
            },
            include: {
                createdBy: {
                    select: { id: true, name: true, profilePicture: true },
                },
            },
        });

        if (!album) {
            return NextResponse.json({ error: "Album not found" }, { status: 404 });
        }

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
            album,
            images,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("GET /api/schools/[schoolId]/gallery/albums/[albumId] error:", error);
        return NextResponse.json(
            { error: "Failed to fetch album" },
            { status: 500 }
        );
    }
}

// PATCH /api/schools/[schoolId]/gallery/albums/[albumId] - Update album
export async function PATCH(request, { params }) {
    try {
        const { schoolId, albumId } = await params;
        const body = await request.json();

        const {
            title,
            description,
            coverImage,
            eventDate,
            category,
            isPublic,
            visibility,
        } = body;

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (coverImage !== undefined) updateData.coverImage = coverImage;
        if (eventDate !== undefined) updateData.eventDate = eventDate ? new Date(eventDate) : null;
        if (category !== undefined) updateData.category = category;
        if (isPublic !== undefined) updateData.isPublic = isPublic;
        if (visibility !== undefined) updateData.visibility = visibility;

        const album = await prisma.galleryAlbum.update({
            where: { id: albumId },
            data: updateData,
            include: {
                createdBy: {
                    select: { id: true, name: true, profilePicture: true },
                },
            },
        });

        return NextResponse.json({ album });
    } catch (error) {
        console.error("PATCH /api/schools/[schoolId]/gallery/albums/[albumId] error:", error);
        return NextResponse.json(
            { error: "Failed to update album" },
            { status: 500 }
        );
    }
}

// DELETE /api/schools/[schoolId]/gallery/albums/[albumId] - Soft delete album
export async function DELETE(request, { params }) {
    try {
        const { schoolId, albumId } = await params;

        // Soft delete the album
        await prisma.galleryAlbum.update({
            where: { id: albumId },
            data: { deletedAt: new Date() },
        });

        // Soft delete all images in the album and reclaim quota
        const images = await prisma.galleryImage.findMany({
            where: { albumId, isActive: true },
            select: { id: true, optimizedSize: true, fileSize: true },
        });

        const totalSizeToReclaim = images.reduce((sum, img) => {
            return sum + (img.optimizedSize || img.fileSize);
        }, 0);

        await prisma.$transaction([
            prisma.galleryImage.updateMany({
                where: { albumId },
                data: { isActive: false, deletedAt: new Date() },
            }),
            prisma.gallerySettings.update({
                where: { schoolId },
                data: {
                    storageUsed: {
                        decrement: totalSizeToReclaim,
                    },
                },
            }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/schools/[schoolId]/gallery/albums/[albumId] error:", error);
        return NextResponse.json(
            { error: "Failed to delete album" },
            { status: 500 }
        );
    }
}
