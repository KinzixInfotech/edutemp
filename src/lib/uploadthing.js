"use client";

import {
    generateUploadButton,
    generateUploadDropzone,
    generateReactHelpers,
} from "@uploadthing/react";

export const UploadButton = generateUploadButton();
export const UploadDropzone = generateUploadDropzone();

// no router argument
export const { useUploadThing, uploadFiles } = generateReactHelpers();
