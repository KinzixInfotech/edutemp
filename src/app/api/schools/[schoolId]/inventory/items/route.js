import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";
import { getPagination, paginate } from "@/lib/api-utils";

// GET: List inventory items with server-side pagination, search, filter, sort
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const categoryId = searchParams.get("categoryId") || "";
        const status = searchParams.get("status") || "";
        const sortColumn = searchParams.get("sortColumn") || "name";
        const sortDirection = searchParams.get("sortDirection") === "desc" ? "desc" : "asc";
        const all = searchParams.get("all") === "true"; // bypass pagination for dropdowns

        // Validate sort column
        const validSortColumns = ["name", "quantity", "costPerUnit", "sellingPrice", "location", "status"];
        const validSort = validSortColumns.includes(sortColumn) ? sortColumn : "name";

        const where = {
            schoolId,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { vendorName: { contains: search, mode: "insensitive" } },
                    { location: { contains: search, mode: "insensitive" } },
                    { barcode: { contains: search, mode: "insensitive" } },
                ],
            }),
            ...(categoryId && categoryId !== "all" && { categoryId }),
            ...(status && status !== "all" && {
                // Handle both low_stock filter and actual status field
                ...(status === "low" ? { quantity: { lte: 5 } } : {}),
                ...(status === "in_stock" ? { quantity: { gt: 5 } } : {}),
            }),
        };

        const orderBy = { [validSort]: sortDirection };

        // ?all=true — used by sale dialog to get all sellable items
        if (all) {
            const items = await prisma.inventoryItem.findMany({
                where: { schoolId, isSellable: true, quantity: { gt: 0 } },
                orderBy: { name: "asc" },
            });
            return NextResponse.json({ data: items, meta: { total: items.length, totalPages: 1, page: 1, limit: items.length } });
        }

        const { page, limit } = getPagination(request);
        const cacheKey = generateKey("inventory:items", { schoolId, search, categoryId, status, sortColumn, sortDirection, page, limit });

        const result = await remember(cacheKey, async () => {
            return await paginate(prisma.inventoryItem, { where, orderBy }, page, limit);
        }, 60); // 60s cache — shorter since inventory changes frequently

        return NextResponse.json(result); // { data, meta }
    } catch (error) {
        console.error("Error fetching inventory items:", error);
        return NextResponse.json({ error: "Failed to fetch inventory items" }, { status: 500 });
    }
}

// POST: Create inventory item
export async function POST(request, { params }) {
    try {
        const { schoolId } = await params;
        const body = await request.json();
        const {
            name, categoryId, quantity, unit, purchaseDate,
            costPerUnit, sellingPrice, isSellable, vendorName,
            vendorContact, location, status, imageUrl,
        } = body;

        const validCategoryId = categoryId && categoryId.trim() !== "" ? categoryId : null;

        // Normalize status to uppercase
        const normalizedStatus = (status || "IN_STOCK").toUpperCase();

        const newItem = await prisma.inventoryItem.create({
            data: {
                schoolId,
                name,
                categoryId: validCategoryId,
                quantity: parseInt(quantity),
                minimumQuantity: 5,
                maximumQuantity: 1000,
                unit,
                purchaseDate: new Date(purchaseDate),
                costPerUnit: parseFloat(costPerUnit),
                sellingPrice: sellingPrice ? parseFloat(sellingPrice) : 0,
                isSellable: isSellable || false,
                vendorName,
                vendorContact,
                location,
                status: normalizedStatus,
                imageUrl: imageUrl || null,
            },
        });

        await invalidatePattern(`inventory:*${schoolId}*`);
        return NextResponse.json(newItem, { status: 201 });
    } catch (error) {
        console.error("Error creating inventory item:", error);
        return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
    }
}