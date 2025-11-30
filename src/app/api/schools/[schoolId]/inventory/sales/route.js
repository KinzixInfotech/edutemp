import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: List sales
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const where = {
            schoolId,
            ...(startDate && endDate && {
                saleDate: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            }),
        };

        const sales = await prisma.inventorySale.findMany({
            where,
            include: {
                items: {
                    include: {
                        item: true,
                    },
                },
            },
            orderBy: { saleDate: "desc" },
        });

        return NextResponse.json(sales);
    } catch (error) {
        console.error("Error fetching sales:", error);
        return NextResponse.json(
            { error: "Failed to fetch sales" },
            { status: 500 }
        );
    }
}

// POST: Create a sale
export async function POST(request, { params }) {
    try {
        const { schoolId } = await params;
        const body = await request.json();
        const { buyerName, buyerId, buyerType, items, paymentMethod } = body;

        if (!buyerName || !items || items.length === 0) {
            return NextResponse.json(
                { error: "Buyer name and items are required" },
                { status: 400 }
            );
        }

        // Calculate total and validate stock
        let totalAmount = 0;
        const saleItems = [];

        for (const item of items) {
            const inventoryItem = await prisma.inventoryItem.findUnique({
                where: { id: item.itemId },
            });

            if (!inventoryItem) {
                return NextResponse.json(
                    { error: `Item ${item.itemId} not found` },
                    { status: 404 }
                );
            }

            if (!inventoryItem.isSellable) {
                return NextResponse.json(
                    { error: `Item ${inventoryItem.name} is not sellable` },
                    { status: 400 }
                );
            }

            if (inventoryItem.quantity < item.quantity) {
                return NextResponse.json(
                    { error: `Insufficient stock for ${inventoryItem.name}` },
                    { status: 400 }
                );
            }

            const unitPrice = inventoryItem.sellingPrice || inventoryItem.costPerUnit;
            const itemTotal = unitPrice * item.quantity;
            totalAmount += itemTotal;

            saleItems.push({
                itemId: item.itemId,
                quantity: item.quantity,
                unitPrice,
                totalPrice: itemTotal,
            });
        }

        // Create sale with transaction
        const sale = await prisma.$transaction(async (tx) => {
            // Create sale
            const newSale = await tx.inventorySale.create({
                data: {
                    schoolId,
                    buyerName,
                    buyerId,
                    buyerType,
                    totalAmount,
                    paymentMethod: paymentMethod || "CASH",
                    status: "COMPLETED",
                    items: {
                        create: saleItems,
                    },
                },
                include: {
                    items: true,
                },
            });

            // Update inventory quantities
            for (const item of items) {
                await tx.inventoryItem.update({
                    where: { id: item.itemId },
                    data: {
                        quantity: {
                            decrement: item.quantity,
                        },
                    },
                });

                // Create inventory transaction record
                await tx.inventoryTransaction.create({
                    data: {
                        itemId: item.itemId,
                        transactionType: "SALE",
                        quantity: -item.quantity,
                        date: new Date(),
                        handledById: buyerId || "SYSTEM",
                        handledByName: buyerName,
                        status: "COMPLETED",
                        remarks: `Sale to ${buyerName}`,
                    },
                });
            }

            return newSale;
        });

        return NextResponse.json(sale, { status: 201 });
    } catch (error) {
        console.error("Error creating sale:", error);
        return NextResponse.json(
            { error: "Failed to create sale" },
            { status: 500 }
        );
    }
}