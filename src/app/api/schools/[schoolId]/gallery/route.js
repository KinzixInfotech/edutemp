import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/schools/[schoolId]/gallery - Get gallery overview (albums + quota status)
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;

        // Get or create gallery settings
        let settings = await prisma.gallerySettings.findUnique({
            where: { schoolId },
        });

        if (!settings) {
            settings = await prisma.gallerySettings.create({
                data: { schoolId },
            });
        }

        // Get albums with image counts
        const albums = await prisma.galleryAlbum.findMany({
            where: {
                schoolId,
                deletedAt: null,
            },
            orderBy: { createdAt: "desc" },
            include: {
                createdBy: {
                    select: { id: true, name: true, profilePicture: true },
                },
                _count: {
                    select: {
                        images: {
                            where: { isActive: true },
                        },
                    },
                },
            },
        });

        // Calculate actual storage used from images
        const storageResult = await prisma.galleryImage.aggregate({
            where: {
                schoolId,
                isActive: true,
            },
            _sum: {
                fileSize: true,
            },
        });
        const actualStorageUsed = storageResult._sum.fileSize || 0;

        // Calculate quota info
        const quotaInfo = {
            used: actualStorageUsed,
            total: Number(settings.storageQuota),
            percentUsed: Math.round(
                (actualStorageUsed / Number(settings.storageQuota)) * 100
            ),
            remaining: Number(settings.storageQuota) - actualStorageUsed,
            maxImageSize: settings.maxImageSize,
            dailyUploadLimit: settings.dailyUploadLimit,
        };

        // Get today's upload count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayUploads = await prisma.galleryImage.count({
            where: {
                schoolId,
                uploadedAt: { gte: today },
            },
        });

        return NextResponse.json({
            albums: albums.map((album) => ({
                ...album,
                imageCount: album._count.images,
                _count: undefined,
            })),
            quota: quotaInfo,
            todayUploads,
            remainingUploadsToday: Math.max(0, settings.dailyUploadLimit - todayUploads),
            settings: {
                requireApproval: settings.requireApproval,
                allowPublicView: settings.allowPublicView,
            },
        });
    } catch (error) {
        console.error("GET /api/schools/[schoolId]/gallery error:", error);
        return NextResponse.json(
            { error: "Failed to fetch gallery" },
            { status: 500 }
        );
    }
}
