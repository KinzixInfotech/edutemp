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
                totalRevenue,
                totalCost,
                recentSales,
            ] = await Promise.all([
                prisma.inventoryItem.count({ where: { schoolId } }),
                prisma.inventoryItem.count({
                    where: {
                        schoolId,
                        quantity: {
                            lte: prisma.inventoryItem.fields.minimumQuantity,
                        },
                    },
                }),
                prisma.inventorySale.aggregate({
                    where: { schoolId, status: "COMPLETED" },
                    _sum: {
                        totalAmount: true,
                    },
                }),
                prisma.inventoryItem.aggregate({
                    where: { schoolId },
                    _sum: {
                        costPerUnit: true,
                    },
                }),
                prisma.inventorySale.count({
                    where: {
                        schoolId,
                        saleDate: {
                            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
                        },
                    },
                }),
            ]);

            const revenue = totalRevenue._sum.totalAmount || 0;
            const cost = totalCost._sum.costPerUnit || 0;
            const profit = revenue - cost;

            return {
                totalItems,
                lowStockItems,
                totalRevenue: revenue,
                totalProfit: profit,
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
