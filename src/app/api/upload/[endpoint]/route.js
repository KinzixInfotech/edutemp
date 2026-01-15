// API route for direct file uploads from mobile app
// This bypasses UploadThing's client library and handles uploads directly

import { createUploadthing, createRouteHandler } from "uploadthing/next";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";
import { ourFileRouter } from "../../uploadthing/route";



// Simple upload handler that accepts FormData
export async function POST(req, { params }) {
    try {
        const { endpoint } = await params;

        // Get form data

        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Get metadata from form data
        const schoolId = formData.get('schoolId');
        const classId = formData.get('classId');
        const teacherId = formData.get('teacherId');
        const title = formData.get('title');

        // For now, we'll store the file using UploadThing's server-side API
        // This is a placeholder - you may need to implement proper file storage

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create a unique filename
        const filename = `${Date.now()}_${file.name}`;

        // For actual implementation, you'd upload to your storage (S3, UploadThing, etc.)
        // For now, return a mock response
        // TODO: Integrate with actual storage solution

        console.log(`[Upload/${endpoint}] Received file:`, file.name, 'Size:', buffer.length);

        // Track in database
        if (schoolId) {
            await prisma.upload.create({
                data: {
                    schoolId,
                    fileUrl: `https://placeholder.url/${filename}`,
                    fileName: file.name,
                    mimeType: file.type,
                    size: buffer.length,
                },
            });
        }

        return NextResponse.json({
            success: true,
            url: `https://placeholder.url/${filename}`,
            name: file.name,
            size: buffer.length,
        });

    } catch (error) {
        console.error('[Upload] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
