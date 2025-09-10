// pages/api/inventory/purchase-orders.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const orders = await prisma.purchaseOrder.findMany({
            include: { items: { include: { item: true } } },
        });
        return NextResponse.json(orders, { status: 200 });
    } catch (error) {
        console.error("Error fetching purchase orders:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { items, orderDate, expectedDelivery, vendorName, vendorContact, approvedById, approvedByName, status } = body;

        if (!orderDate || !expectedDelivery || !vendorName || !vendorContact || !approvedById || !approvedByName || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!["ORDERED", "DELIVERED", "CANCELLED"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const newOrder = await prisma.purchaseOrder.create({
            data: {
                orderDate: new Date(orderDate),
                expectedDelivery: new Date(expectedDelivery),
                vendorName,
                vendorContact,
                approvedById,
                approvedByName,
                status,
            },
        });

        for (const item of items) {
            await prisma.purchaseOrderItem.create({
                data: {
                    purchaseOrderId: newOrder.id,
                    itemId: item.itemId,
                    name: item.name,
                    quantity: item.quantity,
                    costPerUnit: item.costPerUnit,
                },
            });

            if (status === "DELIVERED") {
                await prisma.inventoryItem.update({
                    where: { id: item.itemId },
                    data: { quantity: { increment: item.quantity } },
                });
            }
        }

        return NextResponse.json(newOrder, { status: 201 });
    } catch (error) {
        console.error("Error creating purchase order:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, items, ...data } = body;

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        await prisma.purchaseOrder.update({
            where: { id },
            data: {
                ...data,
                orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
                expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : undefined,
            },
        });

        // Handle items update (delete existing and recreate if needed)
        if (items) {
            await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
            for (const item of items) {
                await prisma.purchaseOrderItem.create({
                    data: {
                        purchaseOrderId: id,
                        itemId: item.itemId,
                        name: item.name,
                        quantity: item.quantity,
                        costPerUnit: item.costPerUnit,
                    },
                });
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Error updating purchase order:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
        await prisma.purchaseOrder.delete({ where: { id } });
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("Error deleting purchase order:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}