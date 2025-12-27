import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        if (!schoolId || schoolId === 'null') {
            return NextResponse.json({ error: 'Invalid schoolId' }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const categoryId = searchParams.get('categoryId');
        const search = searchParams.get('search') || '';

        // Use shorter cache or no cache for this endpoint
        const cacheKey = generateKey('director:inventory', { schoolId, categoryId, search });

        const data = await remember(cacheKey, async () => {
            const searchWhere = search ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { category: { contains: search, mode: 'insensitive' } }
                ]
            } : {};

            const where = {
                schoolId,
                ...(categoryId && { categoryId }),
                ...searchWhere
            };

            const [items, categories, lowStockCount, totalCount] = await Promise.all([
                prisma.inventoryItem.findMany({
                    where,
                    include: {
                        // Use correct relation name
                        InventoryCategory: { select: { name: true } }
                    },
                    orderBy: { name: 'asc' },
                    take: 100
                }).catch((e) => {
                    console.log('Items fetch error:', e.message);
                    return [];
                }),
                prisma.inventoryCategory.findMany({
                    where: { schoolId },
                    include: {
                        _count: {
                            select: { items: true }
                        }
                    }
                }).catch(() => []),
                prisma.inventoryItem.count({
                    where: {
                        schoolId,
                        quantity: { lte: prisma.inventoryItem.fields?.minimumQuantity || 10 }
                    }
                }).catch(() => 0),
                prisma.inventoryItem.count({ where: { schoolId } }).catch(() => 0)
            ]);

            // Calculate in-stock count
            const inStockCount = items.filter(i => i.quantity > (i.minimumQuantity || 10)).length;

            return {
                summary: {
                    totalItems: totalCount,
                    inStock: inStockCount,
                    lowStock: lowStockCount,
                    categories: categories.length
                },
                categories: categories.map(c => ({
                    id: c.id,
                    name: c.name,
                    itemCount: c._count?.items || 0
                })),
                items: items.map(item => ({
                    id: item.id,
                    name: item.name,
                    // Use legacy category field or relation
                    category: item.InventoryCategory?.name || item.category || 'Uncategorized',
                    categoryId: item.categoryId,
                    quantity: item.quantity,
                    minQuantity: item.minimumQuantity,
                    unit: item.unit,
                    status: item.status,
                    costPerUnit: item.costPerUnit,
                    sellingPrice: item.sellingPrice,
                    isLowStock: item.quantity <= (item.minimumQuantity || 10),
                    location: item.location,
                    lastUpdated: item.updatedAt?.toISOString?.() || null
                }))
            };
        }, 30); // Shorter cache

        return NextResponse.json(data);
    } catch (error) {
        console.error('[INVENTORY ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch inventory data', details: error.message },
            { status: 500 }
        );
    }
}
