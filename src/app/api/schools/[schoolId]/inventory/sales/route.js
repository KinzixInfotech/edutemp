// app/api/schools/[schoolId]/inventory/sales/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { remember, invalidatePattern } from "@/lib/cache";

const NS = (schoolId) => `inv:${schoolId}`;
const DEFAULT_WINDOW_MONTHS = 6;

// ─── Safely coerce any value (Prisma Decimal, string, number) to a JS float ──
// Prisma Decimal fields come back as Decimal objects from the ORM.
// In JS arithmetic, Decimal objects behave unpredictably:
//   - Decimal(0) is an object → TRUTHY → `|| fallback` never fires
//   - Decimal(750) * 2 → calls valueOf() → "750" * 2 = 1500 (works by accident)
//   - Decimal(0) * 40  → "0" * 40 = 0 (stored as 0 in DB — root cause of negative profit)
// Always run all Prisma numeric fields through toNum() before any arithmetic.
const toNum = (v) => {
    if (v === null || v === undefined) return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
};

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const effectiveStart = startDate
            ? new Date(startDate)
            : new Date(new Date().setMonth(new Date().getMonth() - DEFAULT_WINDOW_MONTHS));
        const effectiveEnd = endDate ? new Date(endDate) : new Date();

        const cacheKey = `${NS(schoolId)}:sales:${effectiveStart.toISOString().split("T")[0]}:${effectiveEnd.toISOString().split("T")[0]}`;

        const sales = await remember(cacheKey, async () => {
            return prisma.inventorySale.findMany({
                where: {
                    schoolId,
                    saleDate: { gte: effectiveStart, lte: effectiveEnd },
                },
                include: { items: { include: { item: true } } },
                orderBy: { saleDate: "desc" },
            });
        }, 60);

        return NextResponse.json(sales);
    } catch (error) {
        console.error("GET /inventory/sales error:", error);
        return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
    }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request, { params }) {
    try {
        const { schoolId } = await params;
        const body = await request.json();
        const { buyerName, buyerId, buyerType, items, paymentMethod } = body;

        if (!buyerName?.trim() || !items?.length) {
            return NextResponse.json(
                { error: "buyerName and at least one item are required" },
                { status: 400 }
            );
        }

        // Cross-school ownership check before opening a transaction
        const itemIds = [...new Set(items.map((i) => i.itemId))];
        const ownedItems = await prisma.inventoryItem.findMany({
            where: { id: { in: itemIds }, schoolId },
            select: { id: true },
        });
        if (ownedItems.length !== itemIds.length) {
            const found = new Set(ownedItems.map((i) => i.id));
            const missing = itemIds.filter((id) => !found.has(id));
            return NextResponse.json({ error: `Item(s) not found: ${missing.join(", ")}` }, { status: 404 });
        }

        const sale = await prisma.$transaction(async (tx) => {
            let totalAmount = 0;
            const saleItems = [];

            for (const item of items) {
                const inv = await tx.inventoryItem.findUnique({ where: { id: item.itemId } });

                if (!inv) throw Object.assign(new Error(`Item not found: ${item.itemId}`), { status: 404 });
                if (!inv.isSellable) throw Object.assign(new Error(`"${inv.name}" is not sellable`), { status: 400 });

                // ── CRITICAL: coerce Prisma Decimal to plain JS number BEFORE any check ──
                // inv.sellingPrice is a Decimal object. Decimal(0) is an OBJECT → truthy.
                // `Decimal(0) || costPerUnit` returns Decimal(0) — fallback never fires.
                // This was storing unitPrice=0 in DB → stats showed negative profit.
                // Fix: explicit numeric comparison after Number() conversion.
                const sellingPrice = toNum(inv.sellingPrice);
                const costPerUnit = toNum(inv.costPerUnit);
                const unitPrice = sellingPrice > 0 ? sellingPrice : costPerUnit;

                // Atomic test-and-decrement — prevents negative stock under concurrency
                const { count } = await tx.inventoryItem.updateMany({
                    where: { id: item.itemId, quantity: { gte: item.quantity } },
                    data: { quantity: { decrement: item.quantity } },
                });
                if (count === 0) {
                    throw Object.assign(
                        new Error(`Insufficient stock for "${inv.name}"`),
                        { status: 409 }
                    );
                }

                // Round to 2 decimal places to avoid float accumulation errors
                const itemTotal = Math.round(unitPrice * item.quantity * 100) / 100;
                totalAmount += itemTotal;

                saleItems.push({
                    itemId: item.itemId,
                    quantity: item.quantity,
                    unitPrice,                               // plain number, stored correctly
                    totalPrice: itemTotal,
                });

                await tx.inventoryTransaction.create({
                    data: {
                        itemId: item.itemId, transactionType: "SALE",
                        quantity: -item.quantity, date: new Date(),
                        handledById: buyerId || "SYSTEM", handledByName: buyerName,
                        status: "COMPLETED", remarks: `Sale to ${buyerName}`,
                    },
                });
            }

            // Final rounding of totalAmount to avoid float accumulation drift
            totalAmount = Math.round(totalAmount * 100) / 100;

            return tx.inventorySale.create({
                data: {
                    schoolId, buyerName, buyerId, buyerType, totalAmount,
                    paymentMethod: paymentMethod || "CASH", status: "COMPLETED",
                    items: { create: saleItems },
                },
                include: { items: { include: { item: true } } },
            });
        });

        await Promise.all([
            invalidatePattern(`${NS(schoolId)}:items:*`),
            invalidatePattern(`${NS(schoolId)}:stats`),
            invalidatePattern(`${NS(schoolId)}:sales:*`),
        ]);

        return NextResponse.json(sale, { status: 201 });
    } catch (error) {
        const status = error.status || 500;
        const message = status < 500 ? error.message : "Failed to create sale";
        console.error("POST /inventory/sales error:", error);
        return NextResponse.json({ error: message }, { status });
    }
}