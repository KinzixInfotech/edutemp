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

    //  Image upload for each school (library)
    // schoolImageUpload: f({ image: { maxFileSize: "4MB" } })
    //     .input(z.object({ schoolId: z.string() }))
    //     .onUploadComplete(async ({ metadata, file }) => {
    //         console.log("Image uploaded for school:", metadata.schoolId)
    //         console.log("File URL:", file.ufsUrl)
    // await prisma.upload.create({
    //     data: {
    //         schoolId: metadata.schoolId,
    //         fileUrl: file.ufsUrl,
    //         fileName: file.name,
    //         mimeType: file.type,
    //         size: file.size,
    //     },
    // })

    //         return { url: file.ufsUrl }
    //     }),
}
