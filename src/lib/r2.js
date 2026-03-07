import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'edubreezy-assets';

// Public CDN URL for serving files
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://cdn.edubreezy.com';

/**
 * S3-compatible client configured for Cloudflare R2
 */
export const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

// ============================================
// FOLDER STRUCTURE MAPPING
// ============================================
// All files stored as: schools/{schoolId}/{folder}/{timestamp}_{randomId}.{ext}
// Example: schools/abc123/gallery/1709856000000_x4k9m2.jpg
//
// Folder structure:
//   schools/{schoolId}/
//     profile/        → School profile picture, logo
//     students/       → Student profile pictures
//     teachers/       → Teacher profile pictures
//     staff/          → Non-teaching staff, transport staff pics
//     gallery/        → Gallery album images
//     carousel/       → Homepage carousel/banner images
//     certificates/   → Generated certificates, ID cards, admit cards
//     documents/      → PDFs, syllabi, general documents
//     notices/        → Notice attachments
//     homework/       → Homework files & submissions
//     forms/          → Form submission uploads
//     signatures/     → Signature & stamp images
//     inventory/      → Inventory item photos
//     library/        → Book cover images
//     receipts/       → Fee receipt PDFs
//     status/         → Status/story media
//     media/          → Media library items
//     uploads/        → General/uncategorized uploads

/**
 * Map UploadThing endpoint names to R2 folder names
 * This makes migration seamless — same endpoint name, different storage
 */
export const UPLOAD_FOLDERS = {
    profilePictureUploader: 'profile',
    schoolImageUpload: 'uploads',
    galleryImageUpload: 'gallery',
    feeReceiptUploader: 'receipts',
    syllabus: 'documents',
    homework: 'homework',
    bulkCertificateZip: 'certificates',
    formSubmissionUpload: 'forms',
    certificatePdf: 'certificates',
    // Direct folder names
    profile: 'profile',
    students: 'students',
    teachers: 'teachers',
    staff: 'staff',
    gallery: 'gallery',
    carousel: 'carousel',
    certificates: 'certificates',
    documents: 'documents',
    notices: 'notices',
    homework_folder: 'homework',
    forms: 'forms',
    signatures: 'signatures',
    inventory: 'inventory',
    library: 'library',
    receipts: 'receipts',
    status: 'status',
    media: 'media',
    uploads: 'uploads',
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Generate a presigned URL for client-side file upload (PUT)
 * @param {string} key - The object key (path) in the bucket
 * @param {string} contentType - MIME type of the file
 * @param {number} expiresIn - URL expiry in seconds (default 10 minutes)
 * @returns {Promise<string>} Presigned PUT URL
 */
export async function getPresignedUploadUrl(key, contentType, expiresIn = 600) {
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });

    return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Upload a file directly from server-side (Buffer/Blob)
 * Used by API routes for server-side uploads (mobile, PDF generation, etc.)
 * @param {string} key - The object key (path)
 * @param {Buffer|Uint8Array} body - File contents
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public CDN URL for the uploaded file
 */
export async function uploadToR2(key, body, contentType) {
    await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
    }));

    return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Delete a file from R2 by its object key
 * @param {string} key - The object key (path)
 */
export async function deleteFromR2(key) {
    await r2Client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
    }));
}

/**
 * Delete a file from R2 by its full public URL
 * Works with both R2 CDN URLs and old UploadThing URLs (skips those)
 * Replaces: deleteFileByUrl from server-uploadthing.js
 * @param {string} fileUrl - The full URL of the file
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteFileByUrl(fileUrl) {
    if (!fileUrl) return false;

    try {
        // Skip old UploadThing URLs — they'll die on their own
        if (isUploadThingUrl(fileUrl)) {
            console.log('⏭️ Skipping UploadThing URL deletion:', fileUrl);
            return true;
        }

        const key = extractKeyFromUrl(fileUrl);
        if (!key) {
            console.warn('⚠️ Could not extract key from URL:', fileUrl);
            return false;
        }

        await deleteFromR2(key);
        console.log('🗑️ Deleted from R2:', key);
        return true;
    } catch (error) {
        console.error('❌ R2 delete failed:', error);
        return false;
    }
}

// ============================================
// URL HELPERS
// ============================================

/**
 * Check if a URL is from UploadThing (old storage)
 */
export function isUploadThingUrl(url) {
    if (!url) return false;
    return url.includes('utfs.io') ||
        url.includes('ufs.sh') ||
        url.includes('uploadthing.com') ||
        url.includes('ingest.uploadthing.com');
}

/**
 * Extract the R2 object key from a CDN URL
 * e.g., "https://cdn.edubreezy.com/schools/abc/gallery/img.jpg" → "schools/abc/gallery/img.jpg"
 */
export function extractKeyFromUrl(url) {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        const key = parsed.pathname.replace(/^\//, '');
        return key || null;
    } catch {
        return null;
    }
}

/**
 * Generate a clean, structured file key
 * Format: schools/{schoolId}/{folder}/{timestamp}_{randomId}.{ext}
 * Example: schools/abc123/gallery/1709856000000_x4k9m2.jpg
 * 
 * @param {string} filename - Original filename
 * @param {object} options
 * @param {string} options.folder - Folder name (from UPLOAD_FOLDERS or custom)
 * @param {string} options.schoolId - School UUID
 * @returns {string} R2 object key
 */
export function generateFileKey(filename, { folder = 'uploads', subFolder = '', schoolId = 'global' } = {}) {
    // Resolve UploadThing endpoint name to folder if needed
    const resolvedFolder = UPLOAD_FOLDERS[folder] || folder;

    const ext = filename.split('.').pop()?.toLowerCase() || 'bin';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);

    // If subFolder is provided (e.g. albumId), nest files inside it
    // Result: schools/{schoolId}/gallery/{albumId}/timestamp_random.ext
    const path = subFolder ? `${resolvedFolder}/${subFolder}` : resolvedFolder;

    return `schools/${schoolId}/${path}/${timestamp}_${randomId}.${ext}`;
}

/**
 * Get the full public CDN URL for a file key
 */
export function getPublicUrl(key) {
    return `${R2_PUBLIC_URL}/${key}`;
}
