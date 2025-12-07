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
        // .input(
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
}
