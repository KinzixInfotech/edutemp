// app/api/schools/[schoolId]/inventory/stats/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { remember, invalidatePattern } from "@/lib/cache";

const NS = (schoolId) => `inv:${schoolId}`;

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;

        const cacheKey = `${NS(schoolId)}:stats`;

        const stats = await remember(cacheKey, async () => {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            const [totalItems, lowStockItems, revenueAndProfit, salesLast30Days] =
                await Promise.all([
                    prisma.inventoryItem.count({ where: { schoolId } }),

                    prisma.inventoryItem.count({ where: { schoolId, quantity: { lte: 5 } } }),

                    // Single SQL pass — avoids loading all sales into JS memory.
                    //
                    // WHY CASE WHEN unitPrice > 0:
                    // A previous version of the API had a Prisma Decimal bug where
                    // Decimal(0) is truthy in JS, so `sellingPrice || costPerUnit`
                    // returned Decimal(0) instead of falling back to costPerUnit.
                    // This stored unitPrice = 0 in old InventorySaleItem records.
                    // Without the CASE WHEN, those records produce (0 - cost) * qty
                    // = large negative numbers and make totalProfit look like -₹325.92.
                    // With CASE WHEN, corrupted old records contribute 0 to profit
                    // instead of a false negative — accurate going forward.
                    //
                    // NOTE on cost snapshot: we use i."costPerUnit" (current cost).
                    // If an item's cost is updated after a sale, historical profit
                    // will drift. A future improvement is to snapshot costPerUnit
                    // into InventorySaleItem at time of sale.
                    prisma.$queryRaw`
                        SELECT
                            COALESCE(SUM(s."totalAmount"), 0) AS "totalRevenue",
                            COALESCE(SUM(
                                CASE
                                    WHEN si."unitPrice" > 0
                                    THEN (si."unitPrice" - i."costPerUnit") * si.quantity
                                    ELSE 0
                                END
                            ), 0) AS "totalProfit"
                        FROM "InventorySale"     s
                        JOIN "InventorySaleItem" si ON si."saleId" = s.id
                        JOIN "InventoryItem"      i ON i.id        = si."itemId"
                        WHERE s."schoolId" = ${schoolId}
                          AND s.status     = 'COMPLETED'
                    `,

                    prisma.inventorySale.count({
                        where: { schoolId, saleDate: { gte: thirtyDaysAgo } },
                    }),
                ]);

            const row = revenueAndProfit[0] ?? { totalRevenue: 0, totalProfit: 0 };

            // Postgres returns NUMERIC aggregates as strings via $queryRaw — coerce to float
            const totalRevenue = parseFloat(row.totalRevenue) || 0;
            const totalProfit = parseFloat(row.totalProfit) || 0;

            return {
                totalItems,
                lowStockItems,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                totalProfit: Math.round(totalProfit * 100) / 100,
                salesLast30Days,
            };
        }, 60);

        return NextResponse.json(stats);
    } catch (error) {
        console.error("GET /inventory/stats error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}