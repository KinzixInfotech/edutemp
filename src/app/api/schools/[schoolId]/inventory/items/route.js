// app/api/schools/[schoolId]/inventory/items/route.js
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { remember, invalidatePattern } from "@/lib/cache";
import { getPagination } from "@/lib/api-utils";

const NS = (schoolId) => `inv:${schoolId}`;
const hashStr = (s) => s ? createHash("md5").update(s).digest("hex").slice(0, 10) : "none";

const MAX_FIELD_LEN = { name: 200, unit: 50, vendorName: 200, vendorContact: 100, location: 200 };
function validateLengths(fields) {
    for (const [field, max] of Object.entries(MAX_FIELD_LEN)) {
        if (fields[field] && fields[field].length > max)
            return `${field} must be ${max} characters or fewer`;
    }
    return null;
}

export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(request.url);
        const all = searchParams.get("all") === "true";

        if (all) {
            const cacheKey = `${NS(schoolId)}:items:sellable`;
            const items = await remember(cacheKey, async () => {
                return prisma.inventoryItem.findMany({
                    where: { schoolId, isSellable: true, quantity: { gt: 0 } },
                    orderBy: { name: "asc" },
                });
            }, 30);
            return NextResponse.json({
                data: items,
                meta: { total: items.length, totalPages: 1, page: 1, limit: items.length },
            });
        }

        const search = searchParams.get("search") || "";
        const categoryId = searchParams.get("categoryId") || "";
        const status = searchParams.get("status") || "";
        const sortColumn = searchParams.get("sortColumn") || "name";
        const sortDir = searchParams.get("sortDirection") === "desc" ? "desc" : "asc";
        const validSortCols = ["name", "quantity", "costPerUnit", "sellingPrice", "location", "status"];
        const validSort = validSortCols.includes(sortColumn) ? sortColumn : "name";
        const { page, limit } = getPagination(request);

        const cacheKey = `${NS(schoolId)}:items:list:${hashStr(search)}:${categoryId || "none"}:${status || "none"}:${validSort}:${sortDir}:p${page}:l${limit}`;

        const result = await remember(cacheKey, async () => {
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
                // FIX: "low" filter matches items with qty<=5 OR status=LOW_STOCK/OUT_OF_STOCK
                // Previously only checked quantity, missing manually-flagged items.
                ...(status === "low" && {
                    OR: [
                        { quantity: { lte: 5 } },
                        { status: "LOW_STOCK" },
                        { status: "OUT_OF_STOCK" },
                    ],
                }),
                // "in_stock" only shows items that are genuinely in stock both ways
                ...(status === "in_stock" && {
                    quantity: { gt: 5 },
                    status: { notIn: ["LOW_STOCK", "OUT_OF_STOCK"] },
                }),
            };
            const [data, total] = await Promise.all([
                prisma.inventoryItem.findMany({ where, orderBy: { [validSort]: sortDir }, skip: (page - 1) * limit, take: limit }),
                prisma.inventoryItem.count({ where }),
            ]);
            return { data, meta: { total, totalPages: Math.ceil(total / limit), page, limit } };
        }, 60);

        return NextResponse.json(result);
    } catch (error) {
        console.error("GET /inventory/items error:", error);
        return NextResponse.json({ error: "Failed to fetch inventory items" }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    try {
        const { schoolId } = await params;
        const body = await request.json();
        const { name, categoryId, quantity, unit, purchaseDate, costPerUnit, sellingPrice, isSellable, vendorName, vendorContact, location, status, imageUrl } = body;

        if (!name?.trim() || !unit?.trim() || costPerUnit === undefined)
            return NextResponse.json({ error: "name, unit, and costPerUnit are required" }, { status: 400 });

        const lenError = validateLengths({ name, unit, vendorName, vendorContact, location });
        if (lenError) return NextResponse.json({ error: lenError }, { status: 400 });

        if (categoryId?.trim()) {
            const cat = await prisma.inventoryCategory.findUnique({ where: { id: categoryId.trim() }, select: { schoolId: true } });
            if (!cat || cat.schoolId !== schoolId)
                return NextResponse.json({ error: "Category not found" }, { status: 400 });
        }

        const newItem = await prisma.inventoryItem.create({
            data: {
                schoolId, name: name.trim(), categoryId: categoryId?.trim() || null,
                quantity: parseInt(quantity) || 0, minimumQuantity: 5, maximumQuantity: 1000,
                unit: unit.trim(), purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
                costPerUnit: parseFloat(costPerUnit) || 0, sellingPrice: parseFloat(sellingPrice) || 0,
                isSellable: isSellable || false, vendorName: vendorName?.trim() || "",
                vendorContact: vendorContact?.trim() || "", location: location?.trim() || "",
                status: (status || "IN_STOCK").toUpperCase(), imageUrl: imageUrl || null,
            },
        });

        await Promise.all([
            invalidatePattern(`${NS(schoolId)}:items:*`),
            invalidatePattern(`${NS(schoolId)}:stats`),
        ]);

        return NextResponse.json(newItem, { status: 201 });
    } catch (error) {
        console.error("POST /inventory/items error:", error);
        return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
    }
}