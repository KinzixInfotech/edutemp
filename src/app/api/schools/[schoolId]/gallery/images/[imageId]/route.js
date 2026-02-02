import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/schools/[schoolId]/gallery/images/[imageId] - Get single image details
export async function GET(request, { params }) {
    try {
        const { schoolId, imageId } = await params;

        const image = await prisma.galleryImage.findFirst({
            where: {
                id: imageId,
                schoolId,
            },
            include: {
                album: {
                    select: { id: true, title: true, category: true },
                },
                uploadedBy: {
                    select: { id: true, name: true, profilePicture: true },
                },
                approvedBy: {
                    select: { id: true, name: true },
                },
            },
        });

        if (!image) {
            return NextResponse.json({ error: "Image not found" }, { status: 404 });
        }

        return NextResponse.json({ image });
    } catch (error) {
        console.error("GET /api/schools/[schoolId]/gallery/images/[imageId] error:", error);
        return NextResponse.json(
            { error: "Failed to fetch image" },
            { status: 500 }
        );
    }
}

// PATCH /api/schools/[schoolId]/gallery/images/[imageId] - Update image (caption, approval)
export async function PATCH(request, { params }) {
    try {
        const { schoolId, imageId } = await params;
        const body = await request.json();

        const {
            caption,
            altText,
            approvalStatus,
            approvedById,
            rejectionReason,
        } = body;

        const updateData = {};
        if (caption !== undefined) updateData.caption = caption;
        if (altText !== undefined) updateData.altText = altText;

        // Handle approval workflow
        if (approvalStatus !== undefined) {
            updateData.approvalStatus = approvalStatus;
            if (approvalStatus === "APPROVED") {
                updateData.approvedById = approvedById;
                updateData.approvedAt = new Date();
                updateData.rejectionReason = null;
            } else if (approvalStatus === "REJECTED") {
                updateData.approvedById = approvedById;
                updateData.rejectionReason = rejectionReason;
            }
        }

        const image = await prisma.galleryImage.update({
            where: { id: imageId },
            data: updateData,
            include: {
                album: {
                    select: { id: true, title: true },
                },
                uploadedBy: {
                    select: { id: true, name: true },
                },
            },
        });

        return NextResponse.json({ image });
    } catch (error) {
        console.error("PATCH /api/schools/[schoolId]/gallery/images/[imageId] error:", error);
        return NextResponse.json(
            { error: "Failed to update image" },
            { status: 500 }
        );
    }
}

// DELETE /api/schools/[schoolId]/gallery/images/[imageId] - Soft delete image
export async function DELETE(request, { params }) {
    try {
        const { schoolId, imageId } = await params;
        const { searchParams } = new URL(request.url);
        const deletedById = searchParams.get("deletedById");

        // Get image to reclaim quota
        const image = await prisma.galleryImage.findFirst({
            where: { id: imageId, schoolId, isActive: true },
        });

        if (!image) {
            return NextResponse.json({ error: "Image not found" }, { status: 404 });
        }

        // Use final size (optimized if available, otherwise original)
        const sizeToReclaim = image.optimizedSize || image.fileSize;

        // Soft delete and update quota atomically
        await prisma.$transaction([
            prisma.galleryImage.update({
                where: { id: imageId },
                data: {
                    isActive: false,
                    deletedAt: new Date(),
                    deletedById,
                },
            }),
            prisma.gallerySettings.update({
                where: { schoolId },
                data: {
                    storageUsed: {
                        decrement: sizeToReclaim,
                    },
                },
            }),
            prisma.galleryAlbum.update({
                where: { id: image.albumId },
                data: {
                    imageCount: { decrement: 1 },
                },
            }),
        ]);

        return NextResponse.json({ success: true, reclaimedBytes: sizeToReclaim });
    } catch (error) {
        console.error("DELETE /api/schools/[schoolId]/gallery/images/[imageId] error:", error);
        return NextResponse.json(
            { error: "Failed to delete image" },
            { status: 500 }
        );
    }
}
