import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/schools/[schoolId]/gallery/settings - Get gallery settings
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;

        // Use upsert to avoid race condition when multiple requests hit simultaneously
        const settings = await prisma.gallerySettings.upsert({
            where: { schoolId },
            update: {}, // No updates needed, just ensure it exists
            create: { schoolId },
        });

        return NextResponse.json({
            settings: {
                id: settings.id,
                storageQuota: Number(settings.storageQuota),
                storageUsed: Number(settings.storageUsed),
                maxImageSize: settings.maxImageSize,
                dailyUploadLimit: settings.dailyUploadLimit,
                requireApproval: settings.requireApproval,
                allowPublicView: settings.allowPublicView,
            },
        });
    } catch (error) {
        console.error("GET /api/schools/[schoolId]/gallery/settings error:", error);
        return NextResponse.json(
            { error: "Failed to fetch gallery settings" },
            { status: 500 }
        );
    }
}

// PATCH /api/schools/[schoolId]/gallery/settings - Update gallery settings
export async function PATCH(request, { params }) {
    try {
        const { schoolId } = await params;
        const body = await request.json();

        const {
            storageQuota,
            maxImageSize,
            dailyUploadLimit,
            requireApproval,
            allowPublicView,
        } = body;

        const updateData = {};
        if (storageQuota !== undefined) updateData.storageQuota = BigInt(storageQuota);
        if (maxImageSize !== undefined) updateData.maxImageSize = maxImageSize;
        if (dailyUploadLimit !== undefined) updateData.dailyUploadLimit = dailyUploadLimit;
        if (requireApproval !== undefined) updateData.requireApproval = requireApproval;
        if (allowPublicView !== undefined) updateData.allowPublicView = allowPublicView;

        const settings = await prisma.gallerySettings.upsert({
            where: { schoolId },
            update: updateData,
            create: {
                schoolId,
                ...updateData,
            },
        });

        return NextResponse.json({
            success: true,
            settings: {
                id: settings.id,
                storageQuota: Number(settings.storageQuota),
                storageUsed: Number(settings.storageUsed),
                maxImageSize: settings.maxImageSize,
                dailyUploadLimit: settings.dailyUploadLimit,
                requireApproval: settings.requireApproval,
                allowPublicView: settings.allowPublicView,
            },
        });
    } catch (error) {
        console.error("PATCH /api/schools/[schoolId]/gallery/settings error:", error);
        return NextResponse.json(
            { error: "Failed to update gallery settings" },
            { status: 500 }
        );
    }
}
