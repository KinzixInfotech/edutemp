/**
 * Enhanced image cropping utility with rotation and flip support
 */

export const getCroppedImg = async (imageSrc, crop, rotation = 0, flip = { flipH: false, flipV: false }) => {
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

    return new Promise((resolve, reject) => {
        croppedCanvas.toBlob(
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
 * Create an Image object from a URL
 */
function createImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // Handle CORS
        img.addEventListener("load", () => resolve(img));
        img.addEventListener("error", (err) => reject(err));
        img.src = url;
    });
}
