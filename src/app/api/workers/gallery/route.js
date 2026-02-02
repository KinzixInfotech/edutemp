import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Gallery image processing worker
// Called via QStash background job
export async function POST(request) {
    try {
        // Verify QStash signature in production
        // const signature = request.headers.get("upstash-signature");
        // if (!verifySignature(signature, body)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { jobType, imageId, schoolId, originalUrl } = body;

        console.log(`Gallery worker received job: ${jobType} for image ${imageId}`);

        if (jobType === "IMAGE_PROCESS") {
            return await processImage({ imageId, schoolId, originalUrl });
        }

        return NextResponse.json({ error: "Unknown job type" }, { status: 400 });
    } catch (error) {
        console.error("Gallery worker error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function processImage({ imageId, schoolId, originalUrl }) {
    try {
        // Mark as processing
        await prisma.galleryImage.update({
            where: { id: imageId },
            data: { processingStatus: "PROCESSING" },
        });

        // TODO: Implement actual image processing
        // Option 1: Use sharp for server-side processing
        // Option 2: Use Cloudinary/imgix for external processing
        // 
        // Processing steps:
        // 1. Download original from UploadThing
        // 2. Compress and convert to WebP
        // 3. Generate thumbnail (300px width)
        // 4. Upload processed versions back to UploadThing
        // 5. Update image record with new URLs and sizes

        // For now, simulate processing complete
        // In production, replace with actual processing logic:
        /*
        const sharp = require('sharp');
        const fetch = require('node-fetch');
        
        // Download original
        const response = await fetch(originalUrl);
        const buffer = await response.buffer();
        
        // Get image dimensions
        const metadata = await sharp(buffer).metadata();
        
        // Create optimized WebP version
        const optimized = await sharp(buffer)
          .webp({ quality: 80 })
          .toBuffer();
        
        // Create thumbnail
        const thumbnail = await sharp(buffer)
          .resize(300)
          .webp({ quality: 75 })
          .toBuffer();
        
        // Upload to UploadThing and get URLs...
        */

        // Get original image info
        const image = await prisma.galleryImage.findUnique({
            where: { id: imageId },
        });

        if (!image) {
            throw new Error(`Image ${imageId} not found`);
        }

        // Update image as processed (using original URLs/size for now)
        await prisma.$transaction([
            prisma.galleryImage.update({
                where: { id: imageId },
                data: {
                    processingStatus: "COMPLETED",
                    optimizedUrl: originalUrl, // Replace with actual optimized URL
                    thumbnailUrl: originalUrl, // Replace with actual thumbnail URL
                    optimizedSize: image.fileSize, // Replace with actual optimized size
                    // width: metadata.width,
                    // height: metadata.height,
                },
            }),
            prisma.gallerySettings.upsert({
                where: { schoolId },
                update: {
                    storageUsed: { increment: image.fileSize }, // Use optimized size in production
                },
                create: {
                    schoolId,
                    storageUsed: image.fileSize,
                },
            }),
            prisma.galleryAlbum.update({
                where: { id: image.albumId },
                data: { imageCount: { increment: 1 } },
            }),
        ]);

        console.log(`Image ${imageId} processing completed`);
        return NextResponse.json({ success: true, imageId });
    } catch (error) {
        console.error(`Image ${imageId} processing failed:`, error);

        // Mark as failed
        await prisma.galleryImage.update({
            where: { id: imageId },
            data: {
                processingStatus: "FAILED",
                processingError: error.message,
            },
        });

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
