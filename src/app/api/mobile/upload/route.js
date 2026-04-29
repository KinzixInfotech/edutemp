import { NextResponse } from "next/server";
import { uploadToR2, generateFileKey } from "@/lib/r2";
import prisma from "@/lib/prisma";
import { enforceSchoolStateAccess } from '@/lib/school-account-state';

/**
 * Mobile Upload API
 * Handles image uploads from React Native app
 * Uses server-side R2 upload
 */
export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');
        const schoolId = formData.get('schoolId');
        const userId = formData.get('userId');
        const type = formData.get('type') || 'broadcast'; // broadcast, profile, etc.

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        if (!schoolId) {
            return NextResponse.json(
                { error: "School ID is required" },
                { status: 400 }
            );
        }

        const schoolAccess = await enforceSchoolStateAccess({ schoolId, method: req.method });
        if (!schoolAccess.ok) {
            return schoolAccess.response;
        }

        // Convert file to buffer for R2 upload
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to R2
        const key = generateFileKey(file.name, { folder: type, schoolId });
        const fileUrl = await uploadToR2(key, buffer, file.type);

        // Save to Upload table for tracking
        if (schoolId && userId) {
            await prisma.upload.create({
                data: {
                    schoolId,
                    userId,
                    fileUrl,
                    fileName: file.name,
                    mimeType: file.type,
                    size: file.size,
                },
            });
        }

        return NextResponse.json({
            success: true,
            url: fileUrl,
            fileName: file.name,
            size: file.size,
        });
    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json(
            { error: "Failed to upload file", details: error.message },
            { status: 500 }
        );
    }
}
