import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Fetch all media items for a school
export async function GET(req, { params }) {
    const { schoolId } = await params;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "24");
    const skip = (page - 1) * limit;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const where = {
            schoolId,
            ...(search && {
                OR: [
                    { fileName: { contains: search, mode: "insensitive" } },
                    { altText: { contains: search, mode: "insensitive" } },
                ],
            }),
        };

        const [mediaItems, total] = await Promise.all([
            prisma.mediaLibrary.findMany({
                where,
                orderBy: { uploadedAt: "desc" },
                skip,
                take: limit,
                include: {
                    uploadedBy: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            }),
            prisma.mediaLibrary.count({ where }),
        ]);

        return NextResponse.json({
            mediaItems,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching media library:", error);
        return NextResponse.json({ error: "Failed to fetch media library" }, { status: 500 });
    }
}

// POST: Create new media item
export async function POST(req, { params }) {
    const { schoolId } = await params;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { url, fileName, fileSize, mimeType, width, height, uploadedById, altText, tags } = body;

        if (!url || !fileName || !uploadedById) {
            return NextResponse.json(
                { error: "url, fileName, and uploadedById are required" },
                { status: 400 }
            );
        }

        const mediaItem = await prisma.mediaLibrary.create({
            data: {
                schoolId,
                url,
                fileName,
                fileSize: fileSize || 0,
                mimeType: mimeType || "image/jpeg",
                width,
                height,
                uploadedById,
                altText,
                tags,
            },
            include: {
                uploadedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json(mediaItem);
    } catch (error) {
        console.error("Error creating media item:", error);
        return NextResponse.json({ error: "Failed to create media item" }, { status: 500 });
    }
}

// DELETE: Delete media item
export async function DELETE(req, { params }) {
    const { schoolId } = await params;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!schoolId || !id) {
        return NextResponse.json({ error: "School ID and media ID are required" }, { status: 400 });
    }

    try {
        await prisma.mediaLibrary.delete({
            where: {
                id,
                schoolId, // Ensure the media belongs to this school
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting media item:", error);
        return NextResponse.json({ error: "Failed to delete media item" }, { status: 500 });
    }
}
