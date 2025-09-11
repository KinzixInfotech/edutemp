import { createUploadthing } from "uploadthing/next";
import { z } from "zod";

const f = createUploadthing();

export const ourFileRouter = {
    profilePictureUploader: f({ image: { maxFileSize: "4MB" } })
        .input(z.object({ profileId: z.string(), username: z.string() }))
        .onUploadComplete(({ metadata, file }) => {
            console.log("Upload complete for:", metadata.username);
            console.log("File URL:", file.ufsUrl);
        }),

    syllabus: f({ pdf: { maxFileSize: "10MB" } }) // allow PDF files
        .input(z.object({ schoolId: z.string(), classId: z.string() })) // optional metadata
        .onUploadComplete(({ metadata, file }) => {
            console.log("Syllabus uploaded for school:", metadata.schoolId);
            console.log("File URL:", file.ufsUrl);
            return { url: file.ufsUrl }; // can return extra info
        }),
};
