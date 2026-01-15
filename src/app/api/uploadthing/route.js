import { createUploadthing, createRouteHandler } from "uploadthing/next";
import prisma from "@/lib/prisma";
import { z } from "zod";

const f = createUploadthing();

export const ourFileRouter = {
  profilePictureUploader: f({ image: { maxFileSize: "4MB" } })
    .input(z.object({
      schoolId: z.string().nullish(),
      username: z.string().nullish(),
      profileId: z.string().optional(),
    }))
    .middleware(async ({ input }) => {
      // This code runs on your server before upload
      return {
        schoolId: input.schoolId,
        username: input.username,
        profileId: input.profileId
      };
    })
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
      receiptId: z.string().optional(),
    }))
    .middleware(async ({ input }) => {
      return {
        paymentId: input.paymentId,
        schoolId: input.schoolId,
        receiptId: input.receiptId,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Update FeePayment with receipt URL
      await prisma.feePayment.update({
        where: { id: metadata.paymentId },
        data: { receiptUrl: file.ufsUrl },
      });

      // Update Receipt record if provided
      if (metadata.receiptId) {
        await prisma.receipt.update({
          where: { id: metadata.receiptId },
          data: {
            pdfUrl: file.ufsUrl,
            pdfGenerated: true,
          },
        });
      }

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

  homework: f({
    pdf: { maxFileSize: "15MB" },
    image: { maxFileSize: "10MB" },
    "application/msword": { maxFileSize: "10MB" },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "10MB" },
  })
    .input(z.object({
      schoolId: z.string(),
      classId: z.string(),
      teacherId: z.string().optional(),
      title: z.string().optional(),
    }))
    .middleware(async ({ input }) => ({
      schoolId: input.schoolId,
      classId: input.classId,
      teacherId: input.teacherId,
      title: input.title,
    }))
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Homework file uploaded for school:", metadata.schoolId);
      console.log("File URL:", file.ufsUrl);

      // Track upload
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
      } catch (err) {
        console.error("Failed to track homework upload:", err);
      }

      return { url: file.ufsUrl, fileName: file.name, fileSize: file.size };
    }),

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
    .middleware(async ({ input }) => ({
      schoolId: input.schoolId,
      fieldName: input.fieldName,
    }))
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Form file uploaded:", file.ufsUrl);
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
        } catch (error) {
          console.error("Failed to save upload:", error);
        }
      }
      return { url: file.ufsUrl };
    }),
};

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
