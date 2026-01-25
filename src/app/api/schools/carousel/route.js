import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, delCache, generateKey } from '@/lib/cache';

// Cache TTL: 5 minutes (reduced for quicker updates after upload)
const CACHE_TTL = 300;

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('schoolId');
        const role = searchParams.get('role'); // OPTIONAL: Filter by audience role
        const includeInactive = searchParams.get('includeInactive') === 'true'; // For admin view
        const category = searchParams.get('category'); // OPTIONAL: Filter by category

        if (!schoolId) {
            return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
        }

        // Build where clause
        const whereClause = {
            schoolId,
            ...(includeInactive ? {} : {
                isActive: true,
                OR: [
                    { expiryDate: null },
                    { expiryDate: { gt: new Date() } }
                ]
            }),
            ...(category ? { category } : {})
        };

        // For admin (includeInactive), skip cache
        if (includeInactive) {
            const images = await prisma.schoolCarouselImage.findMany({
                where: whereClause,
                orderBy: { displayOrder: 'asc' },
                include: {
                    uploadedBy: {
                        select: { name: true, email: true }
                    }
                }
            });
            return NextResponse.json(images);
        }

        // TEMPORARILY DISABLED CACHE FOR DEBUGGING - always fetch fresh
        // TODO: Re-enable after fixing cache invalidation
        const cacheKey = generateKey('school_carousel', { schoolId });

        // Skip cache, always fetch from DB
        let images = await prisma.schoolCarouselImage.findMany({
            where: whereClause,
            orderBy: { displayOrder: 'asc' },
            include: {
                uploadedBy: {
                    select: { name: true, email: true }
                }
            }
        });

        // Still update cache for when we re-enable
        await setCache(cacheKey, images, CACHE_TTL);

        // Filter by audience if role is provided
        if (role) {
            images = images.filter(img =>
                img.audience.includes('ALL') ||
                img.audience.includes(role) ||
                (role === 'TEACHING_STAFF' && img.audience.includes('TEACHERS')) ||
                (role === 'NON_TEACHING_STAFF' && img.audience.includes('STAFF'))
            );
        }

        return NextResponse.json(images);
    } catch (error) {
        console.error('Error fetching carousel images:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { schoolId, imageUrl, caption, audience, expiryDate, uploadedById, category } = body;

        if (!schoolId || !imageUrl) {
            return NextResponse.json({ error: 'School ID and Image URL are required' }, { status: 400 });
        }

        // Get max display order
        const maxOrder = await prisma.schoolCarouselImage.findFirst({
            where: { schoolId },
            orderBy: { displayOrder: 'desc' },
        });

        const newOrder = (maxOrder?.displayOrder ?? -1) + 1;

        // Create new image
        const newImage = await prisma.schoolCarouselImage.create({
            data: {
                schoolId,
                imageUrl,
                caption,
                audience: audience || ['ALL'],
                displayOrder: newOrder,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                uploadedById: uploadedById || null,
                category: category || null,
            },
        });

        // Invalidate cache
        const cacheKey = generateKey('school_carousel', { schoolId });
        await delCache(cacheKey);
        console.log('🗑️ Carousel cache invalidated for:', cacheKey);

        return NextResponse.json(newImage);
    } catch (error) {
        console.error('Error creating carousel image:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { schoolId, images } = body; // Expects array of { id, displayOrder }

        if (!schoolId || !Array.isArray(images)) {
            return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
        }

        // Use transaction to update all orders
        await prisma.$transaction(
            images.map((img) =>
                prisma.schoolCarouselImage.update({
                    where: { id: img.id },
                    data: { displayOrder: img.displayOrder },
                })
            )
        );

        // Invalidate cache
        const cacheKey = generateKey('school_carousel', { schoolId });
        await delCache(cacheKey);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating carousel order:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH - Toggle active status or update single image fields
export async function PATCH(request) {
    try {
        const body = await request.json();
        const { id, schoolId, isActive, caption, category, audience, expiryDate } = body;

        if (!id) {
            return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
        }

        // Build update data - only include fields that are provided
        const updateData = {};
        if (typeof isActive === 'boolean') updateData.isActive = isActive;
        if (caption !== undefined) updateData.caption = caption;
        if (category !== undefined) updateData.category = category;
        if (audience !== undefined) updateData.audience = audience;
        if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;

        const updated = await prisma.schoolCarouselImage.update({
            where: { id },
            data: updateData,
        });

        // Invalidate cache
        if (schoolId) {
            const cacheKey = generateKey('school_carousel', { schoolId });
            await delCache(cacheKey);
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating carousel image:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
