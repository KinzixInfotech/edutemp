import { withSchoolAccess } from "@/lib/api-auth"; // app/api/schools/[schoolId]/inventory/stats/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { remember, invalidatePattern } from "@/lib/cache";

// ─── CRITICAL: ALL inventory keys must start with this exact prefix ───────────
// invalidatePattern(`inv:${schoolId}:*`) only works if every key in this file
// and every other inventory route uses the same NS() function.
// The old code mixed "inventory:stats" (from generateKey) with "inv:schoolId:stats"
// so SCAN never matched anything and the cache was never actually cleared.
const NS = (schoolId) => `inv:${schoolId}`;

const toNum = (v) => {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

// ─── GET: Stats + loss items ──────────────────────────────────────────────────
export const GET = withSchoolAccess(async function GET(request, { params }) {
  try {
    const { schoolId } = await params;

    // Force-bust on ?bust=1 — useful when you know the cache is stale
    // and want to bypass without waiting for TTL
    const { searchParams } = new URL(request.url);
    const forceBust = searchParams.get("bust") === "1";
    const cacheKey = `${NS(schoolId)}:stats`;

    if (forceBust) {
      await invalidatePattern(cacheKey);
    }

    const stats = await remember(cacheKey, async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [totalItems, lowStockItems, revenueAndProfit, salesLast30Days, lossItems] =
      await Promise.all([
      prisma.inventoryItem.count({ where: { schoolId } }),

      // FIX: count items that are low stock by EITHER:
      // 1. quantity <= 5 (automatic threshold), OR
      // 2. status field explicitly set to 'LOW_STOCK' or 'OUT_OF_STOCK'
      //    (admin manually marked it regardless of actual quantity)
      // Previously only checked quantity, so Floor Cleaner (qty=60, status=LOW_STOCK)
      // and Football (qty=30, status=LOW_STOCK) were missed → count showed 1 not 3.
      prisma.inventoryItem.count({
        where: {
          schoolId,
          OR: [
          { quantity: { lte: 5 } },
          { status: "LOW_STOCK" },
          { status: "OUT_OF_STOCK" }]

        }
      }),

      // CASE WHEN guards against old corrupted unitPrice=0 records.
      // Those were caused by Prisma Decimal(0) being truthy in JS,
      // so `sellingPrice || costPerUnit` returned 0 instead of costPerUnit.
      // Without CASE WHEN: (0 - 500) * 40 = -20000 → totalProfit = -41385.
      // With CASE WHEN: corrupted rows contribute 0, not a giant negative.
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
        where: { schoolId, saleDate: { gte: thirtyDaysAgo } }
      }),

      // Items where selling price is set but is below cost price.
      // These are the items causing negative profit — surface them
      // so admins can fix the price, not just see a red number.
      prisma.inventoryItem.findMany({
        where: {
          schoolId,
          isSellable: true,
          sellingPrice: { gt: 0 } // has a price set
          // selling below cost:
          // Prisma doesn't support column-to-column comparison directly,
          // so we use a raw filter via $queryRaw below instead
        },
        select: { id: true, name: true, costPerUnit: true, sellingPrice: true }
      })]
      );

      // Filter loss items in JS (Prisma can't do col > col without raw SQL)
      const lossItemsFiltered = lossItems.filter(
        (item) => toNum(item.sellingPrice) > 0 && toNum(item.sellingPrice) < toNum(item.costPerUnit)
      ).map((item) => ({
        id: item.id,
        name: item.name,
        costPerUnit: toNum(item.costPerUnit),
        sellingPrice: toNum(item.sellingPrice),
        lossPerUnit: Math.round((toNum(item.costPerUnit) - toNum(item.sellingPrice)) * 100) / 100
      }));

      const row = revenueAndProfit[0] ?? { totalRevenue: 0, totalProfit: 0 };
      const totalRevenue = Math.round(toNum(row.totalRevenue) * 100) / 100;
      const totalProfit = Math.round(toNum(row.totalProfit) * 100) / 100;

      return {
        totalItems,
        lowStockItems,
        totalRevenue,
        totalProfit,
        salesLast30Days,
        // Array of sellable items priced below cost — shown in the UI loss alert
        lossItems: lossItemsFiltered
      };
    }, 60);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /inventory/stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
});