import { NextResponse } from 'next/server';
import { getPresignedUploadUrl, generateFileKey, R2_PUBLIC_URL } from '@/lib/r2';
import { withSchoolAccess } from '@/lib/api-auth';

/**
 * POST /api/r2/presign
 * Generate presigned URLs for client-side file uploads to R2.
 * 
 * Body: {
 *   files: [{ name: string, type: string, size: number }],
 *   folder?: string,     // e.g. "gallery", "profile", "documents"
 *   schoolId?: string,
 * }
 * 
 * Returns: [{ url: string, key: string, publicUrl: string }]
 */
export const POST = withSchoolAccess(async function POST(req) {
    try {
        const body = await req.json();
        const { files, folder = 'uploads', subFolder = '', schoolId = 'global' } = body;

        if (!files || !Array.isArray(files) || files.length === 0) {
            return NextResponse.json(
                { error: 'No files specified' },
                { status: 400 }
            );
        }

        // Validate file count (max 20 per request)
        if (files.length > 20) {
            return NextResponse.json(
                { error: 'Maximum 20 files per request' },
                { status: 400 }
            );
        }

        const presignedUrls = await Promise.all(
            files.map(async (file) => {
                const key = generateFileKey(file.name, { folder, subFolder, schoolId });
                const url = await getPresignedUploadUrl(key, file.type);
                const publicUrl = `${R2_PUBLIC_URL}/${key}`;
                return {
                    url,        // Presigned PUT URL (upload to this)
                    key,        // R2 object key
                    publicUrl,  // Final public URL after upload
                };
            })
        );

        return NextResponse.json(presignedUrls);
    } catch (error) {
        console.error('Presign error:', error);
        return NextResponse.json(
            { error: 'Failed to generate presigned URLs' },
            { status: 500 }
        );
    }
});
