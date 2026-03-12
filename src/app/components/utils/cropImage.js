/**
 * Enhanced image cropping utility with rotation, flip, and output resize support
 * @param {string} imageSrc - Source image URL or data URI
 * @param {object} crop - Crop area { x, y, width, height } in pixels
 * @param {number} rotation - Rotation in degrees
 * @param {object} flip - { flipH: boolean, flipV: boolean }
 * @param {object} [outputSize] - Optional { width, height } to resize the final output to exact dimensions
 */

export const getCroppedImg = async (imageSrc, crop, rotation = 0, flip = { flipH: false, flipV: false }, outputSize = null) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Calculate the bounding box of the rotated image
    const rotRad = getRadianAngle(rotation);
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
    );

    // Set canvas size to bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // Translate canvas center to the center of the bounding box
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.scale(flip.flipH ? -1 : 1, flip.flipV ? -1 : 1);
    ctx.translate(-image.width / 2, -image.height / 2);

    // Draw rotated image
    ctx.drawImage(image, 0, 0);

    // Extract the cropped area
    const croppedCanvas = document.createElement("canvas");
    const croppedCtx = croppedCanvas.getContext("2d");

    // Set the size of the cropped canvas
    croppedCanvas.width = crop.width;
    croppedCanvas.height = crop.height;

    // Draw the cropped section
    croppedCtx.drawImage(
        canvas,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
    );

    // If outputSize is specified, resize to exact target dimensions
    let finalCanvas = croppedCanvas;
    if (outputSize && outputSize.width && outputSize.height) {
        const resizedCanvas = document.createElement("canvas");
        const resizedCtx = resizedCanvas.getContext("2d");
        resizedCanvas.width = outputSize.width;
        resizedCanvas.height = outputSize.height;

        // Use high-quality image smoothing for resize
        resizedCtx.imageSmoothingEnabled = true;
        resizedCtx.imageSmoothingQuality = "high";

        resizedCtx.drawImage(
            croppedCanvas,
            0, 0, croppedCanvas.width, croppedCanvas.height,
            0, 0, outputSize.width, outputSize.height
        );
        finalCanvas = resizedCanvas;
    }

    return new Promise((resolve, reject) => {
        finalCanvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error("Canvas is empty"));
                    return;
                }
                resolve(blob);
            },
            "image/jpeg",
            0.92 // High quality JPEG
        );
    });
};

/**
 * Convert degree angle to radians
 */
function getRadianAngle(degreeValue) {
    return (degreeValue * Math.PI) / 180;
}

/**
 * Calculate the size of the bounding box of a rotated rectangle
 */
function rotateSize(width, height, rotation) {
    const rotRad = getRadianAngle(rotation);

    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}

/**
 * Proxy CDN URLs through our API to bypass CORS restrictions for canvas operations.
 * Local blobs and data URIs are returned as-is.
 */
function getProxiedUrl(url) {
    if (!url || url.startsWith('blob:') || url.startsWith('data:')) return url;
    if (url.includes('cdn.edubreezy.com')) {
        return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
}

/**
 * Create an Image object from a URL
 */
function createImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const proxiedUrl = getProxiedUrl(url);
        // Only set crossOrigin for external URLs (not our proxy or local blobs)
        if (proxiedUrl === url && !url.startsWith('blob:') && !url.startsWith('data:')) {
            img.crossOrigin = "anonymous";
        }
        img.addEventListener("load", () => resolve(img));
        img.addEventListener("error", (err) => reject(err));
        img.src = proxiedUrl;
    });
}
