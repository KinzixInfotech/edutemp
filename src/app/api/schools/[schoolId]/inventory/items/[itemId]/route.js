// app/api/schools/[schoolId]/inventory/items/[itemId]/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { remember, invalidatePattern } from "@/lib/cache";
import { validateItemData } from "@/lib/inventory-validation";

const NS = (schoolId) => `inv:${schoolId}`;

export async function GET(request, { params }) {
    try {
        const { schoolId, itemId } = await params;
        const cacheKey = `${NS(schoolId)}:item:${itemId}`;
        const item = await remember(cacheKey, async () =>
            prisma.inventoryItem.findUnique({ where: { id: itemId, schoolId } }), 120
        );
        if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
        return NextResponse.json(item);
    } catch (error) {
        console.error("GET /inventory/items/[itemId] error:", error);
        return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const { schoolId, itemId } = await params;
        const body = await request.json();

        // ── Shared validation — same rules as UI ──────────────────────────────
        // For PUT we only validate fields that are present (partial update),
        // but if cost/sell are both provided we still run the markup check.
        const partialForValidation = {
            name: body.name ?? "placeholder", // name always present in edit form
            unit: body.unit ?? "placeholder",
            costPerUnit: body.costPerUnit,
            sellingPrice: body.sellingPrice,
            quantity: body.quantity,
            vendorName: body.vendorName,
            vendorContact: body.vendorContact,
            location: body.location,
        };
        const validationError = validateItemData(partialForValidation);
        if (validationError) {
            return NextResponse.json({ error: validationError.error }, { status: validationError.status });
        }

        if (body.categoryId?.trim()) {
            const cat = await prisma.inventoryCategory.findUnique({
                where: { id: body.categoryId.trim() }, select: { schoolId: true },
            });
            if (!cat || cat.schoolId !== schoolId)
                return NextResponse.json({ error: "Category not found" }, { status: 400 });
        }

        let updatedItem;
        try {
            updatedItem = await prisma.inventoryItem.update({
                where: { id: itemId, schoolId },
                data: {
                    ...(body.name !== undefined && { name: body.name.trim() }),
                    ...(body.categoryId !== undefined && { categoryId: body.categoryId?.trim() || null }),
                    ...(body.quantity !== undefined && { quantity: parseInt(body.quantity) }),
                    ...(body.unit !== undefined && { unit: body.unit.trim() }),
                    ...(body.purchaseDate !== undefined && { purchaseDate: new Date(body.purchaseDate) }),
                    ...(body.costPerUnit !== undefined && { costPerUnit: parseFloat(body.costPerUnit) }),
                    ...(body.sellingPrice !== undefined && { sellingPrice: parseFloat(body.sellingPrice) }),
                    ...(body.isSellable !== undefined && { isSellable: body.isSellable }),
                    ...(body.vendorName !== undefined && { vendorName: body.vendorName?.trim() }),
                    ...(body.vendorContact !== undefined && { vendorContact: body.vendorContact?.trim() }),
                    ...(body.location !== undefined && { location: body.location?.trim() }),
                    ...(body.status !== undefined && { status: body.status.toUpperCase() }),
                    ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || null }),
                },
            });
        } catch (e) {
            if (e.code === "P2025") return NextResponse.json({ error: "Item not found" }, { status: 404 });
            throw e;
        }

        await Promise.all([
            invalidatePattern(`${NS(schoolId)}:items:*`),
            invalidatePattern(`${NS(schoolId)}:stats`),
        ]);

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error("PUT /inventory/items/[itemId] error:", error);
        return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { schoolId, itemId } = await params;
        try {
            await prisma.inventoryItem.delete({ where: { id: itemId, schoolId } });
        } catch (e) {
            if (e.code === "P2025") return NextResponse.json({ error: "Item not found" }, { status: 404 });
            throw e;
        }
        await Promise.all([
            invalidatePattern(`${NS(schoolId)}:items:*`),
            invalidatePattern(`${NS(schoolId)}:stats`),
        ]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /inventory/items/[itemId] error:", error);
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
    }
}