import { NextResponse } from "next/server";
import { utapi } from "@/lib/server-uploadthing";
import prisma from "@/lib/prisma";

/**
 * Mobile Upload API
 * Handles image uploads from React Native app
 * Uses server-side UploadThing API
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

        // Convert file to buffer for UploadThing
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create a File object for UploadThing
        const uploadFile = new File([buffer], file.name, { type: file.type });

        // Upload to UploadThing using server-side API
        const response = await utapi.uploadFiles([uploadFile]);

        if (!response?.[0]?.data?.ufsUrl) {
            console.error("Upload failed:", response);
            return NextResponse.json(
                { error: "Upload failed" },
                { status: 500 }
            );
        }

        const fileUrl = response[0].data.ufsUrl;

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
