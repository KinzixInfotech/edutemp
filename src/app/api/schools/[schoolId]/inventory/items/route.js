import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: List inventory items
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const categoryId = searchParams.get("categoryId");

        const where = {
            schoolId,
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { barcode: { contains: search, mode: "insensitive" } },
            ],
            ...(categoryId && { categoryId }),
        };

        const items = await prisma.inventoryItem.findMany({
            where,
            orderBy: { name: "asc" },
        });

        return NextResponse.json(items);
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
        } = body;

        const newItem = await prisma.inventoryItem.create({
            data: {
                schoolId,
                name,
                categoryId,
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
            },
        });

        return NextResponse.json(newItem, { status: 201 });
    } catch (error) {
        console.error("Error creating inventory item:", error);
        return NextResponse.json(
            { error: "Failed to create inventory item" },
            { status: 500 }
        );
    }
}
