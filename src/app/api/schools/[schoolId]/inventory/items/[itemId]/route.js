import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET single inventory item
export async function GET(request, { params }) {
    try {
        const { schoolId, itemId } = await params;

        const item = await prisma.inventoryItem.findFirst({
            where: {
                id: itemId,
                schoolId,
            },
            include: {
                category: true,
            },
        });

        if (!item) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(item);
    } catch (error) {
        console.error("Error fetching inventory item:", error);
        return NextResponse.json(
            { error: "Failed to fetch item" },
            { status: 500 }
        );
    }
}

// UPDATE inventory item
export async function PUT(request, { params }) {
    try {
        const { schoolId, itemId } = await params;
        const body = await request.json();

        const {
            name,
            categoryId,
            quantity,
            unit,
            purchaseDate,
            costPerUnit,
            sellingPrice,
            isSellable,
            vendorName,
            vendorContact,
            location,
            status,
            imageUrl,
        } = body;

        // Handle empty categoryId - convert to null if empty string
        const validCategoryId = categoryId && categoryId.trim() !== "" ? categoryId : null;

        const updatedItem = await prisma.inventoryItem.update({
            where: {
                id: itemId,
                schoolId,
            },
            data: {
                name,
                categoryId: validCategoryId,
                quantity: parseInt(quantity) || 0,
                unit,
                purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
                costPerUnit: parseFloat(costPerUnit) || 0,
                sellingPrice: parseFloat(sellingPrice) || null,
                isSellable: Boolean(isSellable),
                vendorName,
                vendorContact,
                location,
                status,
                imageUrl: imageUrl || null,
            },
        });

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error("Error updating inventory item:", error);
        return NextResponse.json(
            { error: "Failed to update item" },
            { status: 500 }
        );
    }
}

// DELETE inventory item
export async function DELETE(request, { params }) {
    try {
        const { schoolId, itemId } = await params;

        // Check if item exists
        const item = await prisma.inventoryItem.findFirst({
            where: {
                id: itemId,
                schoolId,
            },
        });

        if (!item) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 }
            );
        }

        // Delete the item
        await prisma.inventoryItem.delete({
            where: {
                id: itemId,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting inventory item:", error);
        return NextResponse.json(
            { error: "Failed to delete item" },
            { status: 500 }
        );
    }
}
