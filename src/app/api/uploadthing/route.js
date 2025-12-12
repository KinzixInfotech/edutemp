import { createUploadthing, createRouteHandler } from "uploadthing/next";
import prisma from "@/lib/prisma";
import { z } from "zod";

const f = createUploadthing();

export const ourFileRouter = {
  profilePictureUploader: f({ image: { maxFileSize: "4MB" } })
    .input(z.object({
      schoolId: z.string().nullish(),
      username: z.string().nullish(),
    }))
    .onUploadComplete(async ({ metadata, file }) => {
      if (metadata.schoolId) {
        await prisma.upload.create({
          data: {
            schoolId: metadata.schoolId,
            fileUrl: file.ufsUrl,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
          },
        });
      }
      return { url: file.ufsUrl };
    }),
  // profilePictureUploaderEdubreezy: f({ image: { maxFileSize: "4MB" } })
  //   .input(z.object({
  //     schoolId: z.string().nullable(),
  //     username: z.string().nullable(),
  //   }))
  //   .onUploadComplete(async ({ metadata, file }) => {
  //     if (metadata.schoolId) {
  //       await prisma.upload.create({
  //         data: {
  //           schoolId: metadata.schoolId,
  //           fileUrl: file.ufsUrl,
  //           fileName: file.name,
  //           mimeType: file.type,
  //           size: file.size,
  //         },
  //       });
  //     }
  //     return { url: file.ufsUrl };
  //   }),
  feeReceiptUploader: f({ pdf: { maxFileSize: "2MB" } })
    .input(z.object({
      paymentId: z.string(),
      schoolId: z.string(),
    }))
    .onUploadComplete(async ({ metadata, file }) => {
      await prisma.feePayment.update({
        where: { id: metadata.paymentId },
        data: { receiptUrl: file.ufsUrl },
      });
      return { url: file.ufsUrl };
    }),

  logoupload: f({ image: { maxFileSize: "4MB" } })
    .input(z.object({
      schoolId: z.string().nullish(),
      username: z.string().nullish(),
    }))
    .onUploadComplete(async ({ metadata, file }) => {
      if (metadata.schoolId) {
        await prisma.upload.create({
          data: {
            schoolId: metadata.schoolId,
            fileUrl: file.ufsUrl,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
          },
        });
      }
      return { url: file.ufsUrl };
    }),

  syllabus: f({ pdf: { maxFileSize: "10MB" } })
    .input(z.object({ schoolId: z.string(), classId: z.string() }))
    .onUploadComplete(({ metadata, file }) => ({ url: file.ufsUrl })),

  homework: f({ pdf: { maxFileSize: "10MB" } })
    .input(z.object({ schoolId: z.string(), classId: z.string() }))
    .onUploadComplete(({ metadata, file }) => ({ url: file.ufsUrl })),

  schoolImageUpload: f({ image: { maxFileSize: "5MB", maxFileCount: 10 } })
    .input(z.object({ schoolId: z.string(), uploadedById: z.string() }))
    .middleware(async ({ input }) => ({
      schoolId: input.schoolId,
      uploadedById: input.uploadedById,
    }))
    .onUploadComplete(async ({ metadata, file }) => {
      return await prisma.mediaLibrary.create({
        data: {
          schoolId: metadata.schoolId,
          url: file.ufsUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          uploadedById: metadata.uploadedById,
        },
      });
    }),

  bulkAdmitCardZip: f({ blob: { maxFileSize: "32MB" } })
    .input(z.object({ schoolId: z.string() }))
    .onUploadComplete(({ metadata, file }) => ({ url: file.ufsUrl })),

  admitCardPdf: f({ pdf: { maxFileSize: "16MB" } })
    .input(z.object({ schoolId: z.string() }))
    .onUploadComplete(({ metadata, file }) => ({ url: file.ufsUrl })),

  certificatePdf: f({ pdf: { maxFileSize: "32MB" } })
    .input(z.object({ schoolId: z.string() }))
    .onUploadComplete(({ metadata, file }) => ({ url: file.ufsUrl })),

  bulkCertificateZip: f({ blob: { maxFileSize: "64MB" } })
    .input(z.object({ schoolId: z.string() }))
    .onUploadComplete(({ metadata, file }) => ({ url: file.ufsUrl })),
};

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
