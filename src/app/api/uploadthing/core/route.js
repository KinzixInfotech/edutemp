import prisma from "@/lib/prisma"
import { createUploadthing } from "uploadthing/next"
import { z } from "zod"
// import { prisma } from "@/lib/db" // ← only if using Prisma

const f = createUploadthing()

export const ourFileRouter = {
    profilePictureUploader: f({ image: { maxFileSize: "4MB" } })
        // .input(
        //     z.object({
        //         profileId: z.string().optional(),
        //         username: z.string().optional(),
        //         schoolId: z.string().optional(),
        //     })
        // )
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Profile picture uploaded for:", metadata.username);
            console.log("File URL:", file.ufsUrl);

            //  If schoolId is present, save to library
            if (metadata.schoolId !== null) {
                await prisma.upload.create({
                    data: {
                        schoolId: metadata.schoolId,
                        fileUrl: file.ufsUrl,
                        fileName: file.name,
                        mimeType: file.type,
                        size: file.size,
                    },
                });
                console.log("Saved to library for school:", metadata.schoolId);
            }  // ❌else  No schoolId → skip database save

            return { url: file.ufsUrl };
        }),
    feeReceiptUploader: f({ pdf: { maxFileSize: "2MB" } })
        .input(z.object({
            paymentId: z.string(),
            schoolId: z.string(),
        }))
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Fee receipt uploaded:", file.ufsUrl);

            // Save receipt URL to feePayment
            await prisma.feePayment.update({
                where: { id: metadata.paymentId },
                data: {
                    receiptUrl: file.ufsUrl,
                },
            });

            return { url: file.ufsUrl };
        }),
    logoupload: f({ image: { maxFileSize: "4MB" } })
        // . input(
        //     z.object({
        //         profileId: z.string().optional(),
        //         username: z.string().optional(),
        //         schoolId: z.string().optional(),
        //     })
        // )
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("logo  uploaded for:", metadata.username);
            console.log("File URL:", file.ufsUrl);

            //  If schoolId is present, save to library
            if (metadata.schoolId !== null) {
                await prisma.upload.create({
                    data: {
                        schoolId: metadata.schoolId,
                        fileUrl: file.ufsUrl,
                        fileName: file.name,
                        mimeType: file.type,
                        size: file.size,
                    },
                });
                console.log("Saved to library for school:", metadata.schoolId);
            }  // ❌else  No schoolId → skip database save

            return { url: file.ufsUrl };
        }),


    syllabus: f({ pdf: { maxFileSize: "10MB" } })
        .input(z.object({ schoolId: z.string(), classId: z.string() }))
        .onUploadComplete(({ metadata, file }) => {
            console.log("Syllabus uploaded for school:", metadata.schoolId)
            console.log("File URL:", file.ufsUrl)
            return { url: file.ufsUrl }
        }),

    homework: f({ pdf: { maxFileSize: "10MB" } })
        .input(z.object({ schoolId: z.string(), classId: z.string() }))
        .onUploadComplete(({ metadata, file }) => {
            console.log("Homework uploaded for school:", metadata.schoolId)
            console.log("File URL:", file.ufsUrl)
            return { url: file.ufsUrl }
        }),


    // Image upload for school media library
    schoolImageUpload: f({ image: { maxFileSize: "5MB", maxFileCount: 10 } })
        .input(z.object({ schoolId: z.string(), uploadedById: z.string() }))
        .middleware(async ({ input }) => {
            // Pass input to metadata so it's available in onUploadComplete
            console.log("Middleware - School ID:", input.schoolId);
            console.log("Middleware - Uploaded By:", input.uploadedById);
            return {
                schoolId: input.schoolId,
                uploadedById: input.uploadedById,
            };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            try {
                console.log("=== Upload Complete Callback ===");
                console.log("Full metadata:", JSON.stringify(metadata));
                console.log("School ID from metadata:", metadata.schoolId);
                console.log("File URL:", file.ufsUrl);
                console.log("File name:", file.name);

                // Use ufsUrl instead of deprecated url
                const fileUrl = file.ufsUrl;

                // Save to MediaLibrary
                const savedMedia = await prisma.mediaLibrary.create({
                    data: {
                        schoolId: metadata.schoolId,
                        url: fileUrl,
                        fileName: file.name,
                        fileSize: file.size,
                        mimeType: file.type,
                        uploadedById: metadata.uploadedById,
                    },
                });

                console.log("Successfully saved to MediaLibrary:", savedMedia.id);
                return { url: fileUrl, success: true };
            } catch (error) {
                console.error("ERROR in onUploadComplete:", error);
                console.error("Error details:", error.message);
                console.error("Metadata received:", metadata);
                throw error; // Re-throw to let UploadThing handle it
            }
        }),

    bulkAdmitCardZip: f({ blob: { maxFileSize: "32MB" } })
        .input(z.object({ schoolId: z.string() }))
        .onUploadComplete(({ metadata, file }) => {
            console.log("Bulk Admit Card ZIP uploaded for school:", metadata.schoolId)
            console.log("File URL:", file.ufsUrl)
            return { url: file.ufsUrl }
        }),

    admitCardPdf: f({ pdf: { maxFileSize: "16MB" } })
        .input(z.object({ schoolId: z.string() }))
        .onUploadComplete(({ metadata, file }) => {
            console.log("Admit Card PDF uploaded for school:", metadata.schoolId)
            console.log("File URL:", file.ufsUrl)
            return { url: file.ufsUrl }
        }),
    certificatePdf: f({ pdf: { maxFileSize: "32MB" } })
        .input(z.object({ schoolId: z.string() }))
        .onUploadComplete(({ metadata, file }) => {
            console.log("Certificate PDF uploaded for school:", metadata.schoolId)
            return { url: file.ufsUrl }
        }),
    bulkCertificateZip: f({ blob: { maxFileSize: "64MB" } })
        .input(z.object({ schoolId: z.string() }))
        .onUploadComplete(({ metadata, file }) => {
            console.log("Bulk Certificate ZIP uploaded for school:", metadata.schoolId)
            return { url: file.ufsUrl }
        }),

    // Broadcast/Notice image uploader for mobile app
    broadcastImage: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
        .input(z.object({ schoolId: z.string(), userId: z.string() }))
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Broadcast image uploaded for school:", metadata.schoolId)
            console.log("File URL:", file.ufsUrl)

            // Save to Upload table for tracking
            await prisma.upload.create({
                data: {
                    schoolId: metadata.schoolId,
                    userId: metadata.userId,
                    fileUrl: file.ufsUrl,
                    fileName: file.name,
                    mimeType: file.type,
                    size: file.size,
                },
            });

            return { url: file.ufsUrl }
        }),

    // Form submission file upload (for public forms)
    formSubmissionUpload: f({
        image: { maxFileSize: "10MB" },
        pdf: { maxFileSize: "10MB" },
        "application/msword": { maxFileSize: "10MB" },
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "10MB" },
        "application/vnd.ms-excel": { maxFileSize: "10MB" },
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { maxFileSize: "10MB" },
        audio: { maxFileSize: "20MB" },
        video: { maxFileSize: "50MB" },
    })
        .input(z.object({
            schoolId: z.string().optional(),
            fieldName: z.string().optional(),
        }))
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("Form submission file uploaded:", file.ufsUrl);
            console.log("Field name:", metadata.fieldName);

            // If schoolId provided, optionally save to uploads table
            if (metadata.schoolId && metadata.schoolId !== "public-form") {
                try {
                    await prisma.upload.create({
                        data: {
                            schoolId: metadata.schoolId,
                            fileUrl: file.ufsUrl,
                            fileName: file.name,
                            mimeType: file.type,
                            size: file.size,
                        },
                    });
                    console.log("Saved form upload for school:", metadata.schoolId);
                } catch (error) {
                    console.error("Failed to save upload record:", error);
                }
            }

            return { url: file.ufsUrl };
        }),

    // Gallery image upload with quota validation
    galleryImageUpload: f({ image: { maxFileSize: "10MB", maxFileCount: 20 } })
        .input(z.object({
            schoolId: z.string(),
            albumId: z.string(),
            uploadedById: z.string(),
        }))
        .middleware(async ({ input }) => {
            // Check quota before allowing upload
            const settings = await prisma.gallerySettings.findUnique({
                where: { schoolId: input.schoolId }
            });

            if (settings) {
                if (settings.storageUsed >= settings.storageQuota) {
                    throw new Error('QUOTA_EXCEEDED: Storage quota has been reached');
                }

                // Check daily limit
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayCount = await prisma.galleryImage.count({
                    where: {
                        schoolId: input.schoolId,
                        uploadedAt: { gte: today }
                    }
                });

                if (todayCount >= settings.dailyUploadLimit) {
                    throw new Error('DAILY_LIMIT_EXCEEDED: Daily upload limit reached');
                }
            }

            return input;
        })
        .onUploadComplete(async ({ metadata, file }) => {
            try {
                console.log("Gallery image uploaded for school:", metadata.schoolId);

                // Get settings for approval status
                const settings = await prisma.gallerySettings.findUnique({
                    where: { schoolId: metadata.schoolId }
                });

                const approvalStatus = settings?.requireApproval ? 'PENDING' : 'APPROVED';

                // Create image record with PENDING processing status
                const image = await prisma.galleryImage.create({
                    data: {
                        albumId: metadata.albumId,
                        schoolId: metadata.schoolId,
                        originalUrl: file.ufsUrl,
                        fileName: file.name,
                        fileSize: file.size,
                        mimeType: file.type,
                        uploadedById: metadata.uploadedById,
                        processingStatus: 'PENDING',
                        approvalStatus,
                    }
                });

                // Queue background processing via QStash
                // Note: In production, uncomment and configure QStash
                /*
                const { Client } = await import("@upstash/qstash");
                const qstash = new Client({ token: process.env.QSTASH_TOKEN });
                await qstash.publishJSON({
                    url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/workers/gallery`,
                    body: {
                        jobType: 'IMAGE_PROCESS',
                        imageId: image.id,
                        schoolId: metadata.schoolId,
                        originalUrl: file.ufsUrl,
                    },
                    retries: 3,
                });
                */

                // For now, mark as completed and update quota directly
                // (Remove this block when QStash worker is active)
                await prisma.$transaction([
                    prisma.galleryImage.update({
                        where: { id: image.id },
                        data: {
                            processingStatus: 'COMPLETED',
                            optimizedUrl: file.ufsUrl,
                            thumbnailUrl: file.ufsUrl, // Same URL for now
                            optimizedSize: file.size,
                        }
                    }),
                    prisma.gallerySettings.upsert({
                        where: { schoolId: metadata.schoolId },
                        update: {
                            storageUsed: { increment: file.size }
                        },
                        create: {
                            schoolId: metadata.schoolId,
                            storageUsed: file.size
                        }
                    }),
                    prisma.galleryAlbum.update({
                        where: { id: metadata.albumId },
                        data: { imageCount: { increment: 1 } }
                    })
                ]);

                console.log("Gallery image record created:", image.id);
                return { imageId: image.id, url: file.ufsUrl };
            } catch (error) {
                console.error("ERROR in galleryImageUpload onUploadComplete:", error);
                throw error;
            }
        }),
}
