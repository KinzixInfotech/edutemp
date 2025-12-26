import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(req.url);
        const categoryId = searchParams.get('categoryId');

        const cacheKey = generateKey('director:inventory', { schoolId, categoryId });

        const data = await remember(cacheKey, async () => {
            const where = {
                schoolId,
                ...(categoryId && { categoryId: parseInt(categoryId) })
            };

            const [items, categories, lowStockItems, totalValue] = await Promise.all([
                prisma.inventoryItem.findMany({
                    where,
                    include: {
                        category: { select: { name: true } }
                    },
                    orderBy: { name: 'asc' },
                    take: 100
                }).catch(() => []),
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
                        quantity: { lte: 10 }
                    }
                }).catch(() => 0),
                prisma.inventoryItem.aggregate({
                    where: { schoolId },
                    _sum: {
                        quantity: true
                    }
                }).catch(() => ({ _sum: { quantity: 0 } }))
            ]);

            return {
                summary: {
                    totalItems: items.length,
                    totalQuantity: totalValue._sum.quantity || 0,
                    lowStockItems,
                    categories: categories.length
                },
                categories: categories.map(c => ({
                    id: c.id,
                    name: c.name,
                    itemCount: c._count.items
                })),
                items: items.map(item => ({
                    id: item.id,
                    name: item.name,
                    category: item.category?.name || 'Uncategorized',
                    quantity: item.quantity,
                    unit: item.unit,
                    isLowStock: item.quantity <= 10,
                    lastUpdated: item.updatedAt.toISOString()
                }))
            };
        }, 120);

        return NextResponse.json(data);
    } catch (error) {
        console.error('[INVENTORY ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch inventory data', details: error.message },
            { status: 500 }
        );
    }
}
