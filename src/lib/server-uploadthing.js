import { UTApi } from "uploadthing/server";

export const utapi = new UTApi();

/**
 * Delete a file from UploadThing by its URL
 * @param {string} fileUrl - The full URL of the file (e.g., https://utfs.io/f/abc123...)
 * @returns {Promise<boolean>} - True if deleted, false otherwise
 */
export async function deleteFileByUrl(fileUrl) {
    if (!fileUrl) return false;

    try {
        // Extract file key from URL (last part after /f/)
        const urlParts = fileUrl.split('/');
        const fileKey = urlParts[urlParts.length - 1];

        if (!fileKey) {
            console.warn('⚠️ Could not extract file key from URL:', fileUrl);
            return false;
        }

        await utapi.deleteFiles([fileKey]);
        console.log('🗑️ Deleted orphaned file:', fileKey);
        return true;
    } catch (error) {
        console.error('❌ Failed to delete file:', error);
        return false;
    }
}
