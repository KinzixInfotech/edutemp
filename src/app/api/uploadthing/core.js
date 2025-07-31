import { createUploadthing, } from "uploadthing/next";
import { z } from "zod";

const f = createUploadthing();

export const ourFileRouter = {
    profilePictureUploader: f({ image: { maxFileSize: "4MB" } })
        .input(z.object({ profileId: z.string(), username: z.string() }))
        .onUploadComplete(({ metadata, file }) => {
            console.log("Upload complete for:", metadata.username);
            console.log("File URL:", file.url);
        }),
};
