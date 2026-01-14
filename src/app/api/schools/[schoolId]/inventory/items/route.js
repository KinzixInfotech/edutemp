import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";
import { getPagination, paginate } from "@/lib/api-utils";

// GET: List inventory items
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const categoryId = searchParams.get("categoryId");
        const { page, limit } = getPagination(request);

        const cacheKey = generateKey('inventory:items', { schoolId, search, categoryId, page, limit });

        const result = await remember(cacheKey, async () => {
            const where = {
                schoolId,
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { barcode: { contains: search, mode: "insensitive" } },
                ],
                ...(categoryId && { categoryId }),
            };

            return await paginate(prisma.inventoryItem, {
                where,
                orderBy: { name: "asc" },
            }, page, limit);
        }, 300);

        // Return data array for backward compatibility
        return NextResponse.json(result.data);
    } catch (error) {
        console.error("Error fetching inventory items:", error);
        return NextResponse.json(
            { error: "Failed to fetch inventory items" },
            { status: 500 }
        );
    }
}

// POST: Create inventory item
export async function POST(request, { params }) {
    try {
        const { schoolId } = await params;
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

        const newItem = await prisma.inventoryItem.create({
            data: {
                schoolId,
                name,
                categoryId: validCategoryId,
                quantity: parseInt(quantity),
                minimumQuantity: 5, // Default
                maximumQuantity: 1000, // Default
                unit,
                purchaseDate: new Date(purchaseDate),
                costPerUnit: parseFloat(costPerUnit),
                sellingPrice: sellingPrice ? parseFloat(sellingPrice) : 0,
                isSellable: isSellable || false,
                vendorName,
                vendorContact,
                location,
                status: status || "IN_STOCK",
                imageUrl: imageUrl || null,
            },
        });

        await invalidatePattern(`inventory:*${schoolId}*`);

        return NextResponse.json(newItem, { status: 201 });
    } catch (error) {
        console.error("Error creating inventory item:", error);
        return NextResponse.json(
            { error: "Failed to create inventory item" },
            { status: 500 }
        );
    }
}
