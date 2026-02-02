import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/schools/[schoolId]/gallery/albums - Get all albums
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");

        const where = {
            schoolId,
            deletedAt: null,
        };

        if (category && category !== "ALL") {
            where.category = category;
        }

        const [albums, total] = await Promise.all([
            prisma.galleryAlbum.findMany({
                where,
                orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    createdBy: {
                        select: { id: true, name: true, profilePicture: true },
                    },
                    _count: {
                        select: {
                            images: {
                                where: { isActive: true, approvalStatus: "APPROVED" },
                            },
                        },
                    },
                },
            }),
            prisma.galleryAlbum.count({ where }),
        ]);

        return NextResponse.json({
            albums: albums.map((album) => ({
                ...album,
                imageCount: album._count.images,
                _count: undefined,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("GET /api/schools/[schoolId]/gallery/albums error:", error);
        return NextResponse.json(
            { error: "Failed to fetch albums" },
            { status: 500 }
        );
    }
}

// POST /api/schools/[schoolId]/gallery/albums - Create new album
export async function POST(request, { params }) {
    try {
        const { schoolId } = await params;
        const body = await request.json();

        const {
            title,
            description,
            coverImage,
            eventDate,
            category = "GENERAL",
            isPublic = true,
            visibility = "ALL",
            createdById,
        } = body;

        if (!title || !createdById) {
            return NextResponse.json(
                { error: "Title and createdById are required" },
                { status: 400 }
            );
        }

        const album = await prisma.galleryAlbum.create({
            data: {
                schoolId,
                title,
                description,
                coverImage,
                eventDate: eventDate ? new Date(eventDate) : null,
                category,
                isPublic,
                visibility,
                createdById,
            },
            include: {
                createdBy: {
                    select: { id: true, name: true, profilePicture: true },
                },
            },
        });

        return NextResponse.json({ album }, { status: 201 });
    } catch (error) {
        console.error("POST /api/schools/[schoolId]/gallery/albums error:", error);
        return NextResponse.json(
            { error: "Failed to create album" },
            { status: 500 }
        );
    }
}
