import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/schools/[schoolId]/gallery/images - Get all images (for admin dashboard)
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "30");
        const status = searchParams.get("status"); // PENDING, APPROVED, REJECTED
        const albumId = searchParams.get("albumId");

        const where = {
            schoolId,
            isActive: true,
        };

        if (status) where.approvalStatus = status;
        if (albumId) where.albumId = albumId;

        const [images, total] = await Promise.all([
            prisma.galleryImage.findMany({
                where,
                orderBy: { uploadedAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    album: {
                        select: { id: true, title: true, category: true },
                    },
                    uploadedBy: {
                        select: { id: true, name: true, profilePicture: true },
                    },
                },
            }),
            prisma.galleryImage.count({ where }),
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
        console.error("GET /api/schools/[schoolId]/gallery/images error:", error);
        return NextResponse.json(
            { error: "Failed to fetch images" },
            { status: 500 }
        );
    }
}

// POST /api/schools/[schoolId]/gallery/images - Create image record after upload
// Called by UploadThing onUploadComplete
export async function POST(request, { params }) {
    try {
        const { schoolId } = await params;
        const body = await request.json();

        const {
            albumId,
            originalUrl,
            fileName,
            fileSize,
            mimeType,
            width,
            height,
            caption,
            uploadedById,
        } = body;

        // Validate album exists and belongs to school
        const album = await prisma.galleryAlbum.findFirst({
            where: { id: albumId, schoolId, deletedAt: null },
        });

        if (!album) {
            return NextResponse.json({ error: "Album not found" }, { status: 404 });
        }

        // Check quota
        const settings = await prisma.gallerySettings.findUnique({
            where: { schoolId },
        });

        if (settings) {
            const remaining = Number(settings.storageQuota) - Number(settings.storageUsed);
            if (remaining < fileSize) {
                return NextResponse.json(
                    { error: "QUOTA_EXCEEDED", remaining },
                    { status: 400 }
                );
            }
        }

        // Check daily limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCount = await prisma.galleryImage.count({
            where: { schoolId, uploadedAt: { gte: today } },
        });

        if (settings && todayCount >= settings.dailyUploadLimit) {
            return NextResponse.json(
                { error: "DAILY_LIMIT_EXCEEDED", limit: settings.dailyUploadLimit },
                { status: 400 }
            );
        }

        // Determine initial approval status
        const approvalStatus = settings?.requireApproval ? "PENDING" : "APPROVED";

        // Create image record
        const image = await prisma.galleryImage.create({
            data: {
                albumId,
                schoolId,
                originalUrl,
                fileName,
                fileSize,
                mimeType,
                width,
                height,
                caption,
                uploadedById,
                processingStatus: "PENDING",
                approvalStatus,
            },
        });

        return NextResponse.json({ image }, { status: 201 });
    } catch (error) {
        console.error("POST /api/schools/[schoolId]/gallery/images error:", error);
        return NextResponse.json(
            { error: "Failed to create image record" },
            { status: 500 }
        );
    }
}
