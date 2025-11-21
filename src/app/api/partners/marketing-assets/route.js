// app/api/partners/marketing-assets/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");
    const type = searchParams.get("type");

    if (!partnerId) {
        return NextResponse.json(
            { error: "partnerId is required" },
            { status: 400 }
        );
    }

    try {
        // Get partner level
        const partner = await prisma.partner.findUnique({
            where: { id: partnerId },
            select: { level: true }
        });

        if (!partner) {
            return NextResponse.json(
                { error: "Partner not found" },
                { status: 404 }
            );
        }

        const where = {
            isActive: true,
            partnerLevels: {
                has: partner.level
            }
        };

        if (type && type !== "ALL") {
            where.type = type;
        }

        const assets = await prisma.marketingAsset.findMany({
            where,
            orderBy: [
                { type: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        // Group assets by type
        const groupedAssets = assets.reduce((acc, asset) => {
            if (!acc[asset.type]) {
                acc[asset.type] = [];
            }
            acc[asset.type].push(asset);
            return acc;
        }, {});

        return NextResponse.json({
            success: true,
            assets,
            groupedAssets,
            total: assets.length
        });

    } catch (error) {
        console.error("Fetch marketing assets error:", error);
        return NextResponse.json(
            { error: "Failed to fetch marketing assets" },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            title,
            description,
            type,
            category,
            fileUrl,
            fileName,
            fileSize,
            mimeType,
            thumbnailUrl,
            partnerLevels,
            version
        } = body;

        if (!title || !type || !fileUrl || !fileName) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const asset = await prisma.marketingAsset.create({
            data: {
                title,
                description,
                type,
                category,
                fileUrl,
                fileName,
                fileSize,
                mimeType,
                thumbnailUrl,
                partnerLevels: partnerLevels || ["SILVER", "GOLD", "PLATINUM"],
                version,
                isActive: true
            }
        });

        return NextResponse.json({
            success: true,
            message: "Marketing asset created successfully",
            asset
        }, { status: 201 });

    } catch (error) {
        console.error("Create marketing asset error:", error);
        return NextResponse.json(
            { error: "Failed to create marketing asset" },
            { status: 500 }
        );
    }
}

export async function PATCH(req) {
    try {
        const body = await req.json();
        const { id, assetId, partnerId } = body;

        const assetIdToUse = id || assetId;

        if (!assetIdToUse) {
            return NextResponse.json(
                { error: "Asset ID is required" },
                { status: 400 }
            );
        }

        // Increment download count
        const asset = await prisma.marketingAsset.update({
            where: { id: assetIdToUse },
            data: {
                downloadCount: { increment: 1 }
            }
        });

        // Log download activity if partnerId provided
        if (partnerId) {
            await prisma.partnerActivity.create({
                data: {
                    partnerId,
                    activityType: "ASSET_DOWNLOAD",
                    description: `Downloaded ${asset.title}`,
                    metadata: { assetId: asset.id, assetType: asset.type }
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: "Download tracked successfully"
        });

    } catch (error) {
        console.error("Track download error:", error);
        return NextResponse.json(
            { error: "Failed to track download" },
            { status: 500 }
        );
    }
}

export async function DELETE(req) {
    const body = await req.json();
    const { id } = body;

    if (!id) {
        return NextResponse.json(
            { error: "Asset ID is required" },
            { status: 400 }
        );
    }

    try {
        await prisma.marketingAsset.delete({
            where: { id }
        });

        return NextResponse.json({
            success: true,
            message: "Marketing asset deleted successfully"
        });

    } catch (error) {
        console.error("Delete marketing asset error:", error);
        return NextResponse.json(
            { error: "Failed to delete marketing asset" },
            { status: 500 }
        );
    }
}