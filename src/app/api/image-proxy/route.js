import { NextResponse } from 'next/server';

/**
 * Image proxy to bypass CORS restrictions when loading CDN images
 * onto a canvas (for crop/edit operations).
 * 
 * Usage: /api/image-proxy?url=https://cdn.edubreezy.com/schools/.../image.jpg
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Only allow proxying images from our own CDN
    if (!imageUrl.startsWith('https://cdn.edubreezy.com')) {
        return NextResponse.json({ error: 'Only cdn.edubreezy.com URLs are allowed' }, { status: 403 });
    }

    try {
        const response = await fetch(imageUrl);

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch image: ${response.status}` },
                { status: response.status }
            );
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('Image proxy error:', error);
        return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
    }
}
