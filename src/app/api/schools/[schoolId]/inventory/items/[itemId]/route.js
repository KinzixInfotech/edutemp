// app/api/schools/[schoolId]/inventory/items/[itemId]/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { remember, invalidatePattern } from "@/lib/cache";

const NS = (schoolId) => `inv:${schoolId}`;

const MAX_FIELD_LEN = { name: 200, unit: 50, vendorName: 200, vendorContact: 100, location: 200 };
function validateLengths(fields) {
    for (const [field, max] of Object.entries(MAX_FIELD_LEN)) {
        if (fields[field] && String(fields[field]).length > max)
            return `${field} must be ${max} characters or fewer`;
    }
    return null;
}

export async function GET(request, { params }) {
    try {
        const { schoolId, itemId } = await params;
        const cacheKey = `${NS(schoolId)}:item:${itemId}`;
        const item = await remember(cacheKey, async () => {
            return prisma.inventoryItem.findUnique({ where: { id: itemId, schoolId } });
        }, 120);
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
        const { name, categoryId, quantity, unit, purchaseDate, costPerUnit, sellingPrice, isSellable, vendorName, vendorContact, location, status, imageUrl } = body;

        const lenError = validateLengths({ name, unit, vendorName, vendorContact, location });
        if (lenError) return NextResponse.json({ error: lenError }, { status: 400 });

        if (categoryId?.trim()) {
            const cat = await prisma.inventoryCategory.findUnique({ where: { id: categoryId.trim() }, select: { schoolId: true } });
            if (!cat || cat.schoolId !== schoolId)
                return NextResponse.json({ error: "Category not found" }, { status: 400 });
        }

        let updatedItem;
        try {
            updatedItem = await prisma.inventoryItem.update({
                where: { id: itemId, schoolId },
                data: {
                    ...(name !== undefined && { name: name.trim() }),
                    ...(categoryId !== undefined && { categoryId: categoryId?.trim() || null }),
                    ...(quantity !== undefined && { quantity: parseInt(quantity) }),
                    ...(unit !== undefined && { unit: unit.trim() }),
                    ...(purchaseDate !== undefined && { purchaseDate: new Date(purchaseDate) }),
                    ...(costPerUnit !== undefined && { costPerUnit: parseFloat(costPerUnit) }),
                    ...(sellingPrice !== undefined && { sellingPrice: parseFloat(sellingPrice) }),
                    ...(isSellable !== undefined && { isSellable }),
                    ...(vendorName !== undefined && { vendorName: vendorName?.trim() }),
                    ...(vendorContact !== undefined && { vendorContact: vendorContact?.trim() }),
                    ...(location !== undefined && { location: location?.trim() }),
                    ...(status !== undefined && { status: status.toUpperCase() }),
                    ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
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