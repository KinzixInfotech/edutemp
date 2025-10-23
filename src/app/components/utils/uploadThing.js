import { ourFileRouter } from "@/app/api/uploadthing/core";
import {
    generateUploadButton,
    generateUploadDropzone,
    generateReactHelpers,
} from "@uploadthing/react";
// import { OurFileRouter } from "~/app/api/uploadthing/core";
export const UploadButton = generateUploadButton();
export const UploadDropzone = generateUploadDropzone();

export const { useUploadThing, uploadFiles } = generateReactHelpers({ router: ourFileRouter });