import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;

        const cacheKey = generateKey('inventory:stats', { schoolId });

        const stats = await remember(cacheKey, async () => {
            const [
                totalItems,
                lowStockItems,
                sales,
                recentSales,
            ] = await Promise.all([
                // Total inventory items count
                prisma.inventoryItem.count({ where: { schoolId } }),

                // Count items with low stock (quantity <= 5)
                prisma.inventoryItem.count({
                    where: {
                        schoolId,
                        quantity: { lte: 5 },
                    },
                }),

                // Get all completed sales with their items
                prisma.inventorySale.findMany({
                    where: { schoolId, status: "COMPLETED" },
                    include: {
                        items: {
                            include: {
                                item: true, // Get the inventory item details
                            },
                        },
                    },
                }),

                // Recent sales in last 30 days
                prisma.inventorySale.count({
                    where: {
                        schoolId,
                        saleDate: {
                            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
                        },
                    },
                }),
            ]);

            // Calculate revenue and profit from actual sales
            let totalRevenue = 0;
            let totalProfit = 0;

            for (const sale of sales) {
                totalRevenue += sale.totalAmount || 0;

                // Calculate profit from each sale item
                for (const saleItem of sale.items) {
                    const sellingPrice = saleItem.pricePerUnit || 0;
                    const costPrice = saleItem.item?.costPerUnit || 0;
                    const quantity = saleItem.quantity || 0;

                    // Profit = (Selling Price - Cost Price) * Quantity
                    totalProfit += (sellingPrice - costPrice) * quantity;
                }
            }

            return {
                totalItems,
                lowStockItems,
                totalRevenue,
                totalProfit,
                salesLast30Days: recentSales,
            };
        }, 300);

        return NextResponse.json(stats);
    } catch (error) {
        console.error("Error fetching inventory stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch stats" },
            { status: 500 }
        );
    }
}
