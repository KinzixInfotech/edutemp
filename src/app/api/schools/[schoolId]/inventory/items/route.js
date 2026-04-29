import { withSchoolAccess } from "@/lib/api-auth"; // app/api/schools/[schoolId]/inventory/items/route.js
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { remember, invalidatePattern } from "@/lib/cache";
import { getPagination } from "@/lib/api-utils";
import { validateItemData } from "@/lib/inventory-validation";

const NS = (schoolId) => `inv:${schoolId}`;
const hashStr = (s) => s ? createHash("md5").update(s).digest("hex").slice(0, 10) : "none";

export const GET = withSchoolAccess(async function GET(request, { params }) {
  try {
    const { schoolId } = await params;
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    if (all) {
      const cacheKey = `${NS(schoolId)}:items:sellable`;
      const items = await remember(cacheKey, async () => {
        return prisma.inventoryItem.findMany({
          where: { schoolId, isSellable: true, quantity: { gt: 0 } },
          orderBy: { name: "asc" }
        });
      }, 30);
      return NextResponse.json({
        data: items,
        meta: { total: items.length, totalPages: 1, page: 1, limit: items.length }
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
          { barcode: { contains: search, mode: "insensitive" } }]

        }),
        ...(categoryId && categoryId !== "all" && { categoryId }),
        ...(status === "low" && {
          OR: [
          { quantity: { lte: 5 } },
          { status: "LOW_STOCK" },
          { status: "OUT_OF_STOCK" }]

        }),
        ...(status === "in_stock" && {
          quantity: { gt: 5 },
          status: { notIn: ["LOW_STOCK", "OUT_OF_STOCK"] }
        })
      };
      const [data, total] = await Promise.all([
      prisma.inventoryItem.findMany({ where, orderBy: { [validSort]: sortDir }, skip: (page - 1) * limit, take: limit }),
      prisma.inventoryItem.count({ where })]
      );
      return { data, meta: { total, totalPages: Math.ceil(total / limit), page, limit } };
    }, 60);

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /inventory/items error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory items" }, { status: 500 });
  }
});

export const POST = withSchoolAccess(async function POST(request, { params }) {
  try {
    const { schoolId } = await params;
    const body = await request.json();

    // ── Shared validation — same rules as the UI ──────────────────────────
    const validationError = validateItemData(body);
    if (validationError) {
      return NextResponse.json({ error: validationError.error }, { status: validationError.status });
    }

    const { name, categoryId, quantity, unit, purchaseDate, costPerUnit,
      sellingPrice, isSellable, vendorName, vendorContact, location, status, imageUrl } = body;

    if (categoryId?.trim()) {
      const cat = await prisma.inventoryCategory.findUnique({
        where: { id: categoryId.trim() }, select: { schoolId: true }
      });
      if (!cat || cat.schoolId !== schoolId)
      return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        schoolId, name: name.trim(), categoryId: categoryId?.trim() || null,
        quantity: parseInt(quantity) || 0, minimumQuantity: 5, maximumQuantity: 1000,
        unit: unit.trim(), purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        costPerUnit: parseFloat(costPerUnit) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        isSellable: isSellable || false,
        vendorName: vendorName?.trim() || "", vendorContact: vendorContact?.trim() || "",
        location: location?.trim() || "",
        status: (status || "IN_STOCK").toUpperCase(),
        imageUrl: imageUrl || null
      }
    });

    await Promise.all([
    invalidatePattern(`${NS(schoolId)}:items:*`),
    invalidatePattern(`${NS(schoolId)}:stats`)]
    );

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("POST /inventory/items error:", error);
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
  }
});