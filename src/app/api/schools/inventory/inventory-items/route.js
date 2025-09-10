// pages/api/inventory/items.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");

    if (!schoolId) {
        return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    try {
        const items = await prisma.inventoryItem.findMany({
            where: { schoolId },
            include: { transactions: true, purchaseOrders: true },
        });
        return NextResponse.json(items, { status: 200 });
    } catch (error) {
        console.error("Error fetching inventory items:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { schoolId, ...data } = body;

        if (!schoolId) {
            console.log('school id is required');

            return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
        }

        // Basic validation
        if (!data.name || !data.category || !data.quantity || !data.unit || !data.costPerUnit || !data.vendorName || !data.vendorContact || !data.location || !data.status) {
            console.log('missing', data);

            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newItem = await prisma.inventoryItem.create({
            data: {
                ...data,
                purchaseDate: new Date(), // Automatically set to current date-time
                School: {
                    connect: { id: schoolId }
                }
            },
        });
        return NextResponse.json(newItem, { status: 201 });
    } catch (error) {
        console.error("Error creating inventory item:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, schoolId, ...data } = body;

        if (!id || !schoolId) {
            return NextResponse.json({ error: "id and schoolId are required" }, { status: 400 });
        }

    
        const updatedItem = await prisma.inventoryItem.update({
            where: { id },
            data,
        });
        return NextResponse.json(updatedItem, { status: 200 });
    } catch (error) {
        console.error("Error updating inventory item:", error);
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

        await prisma.inventoryItem.delete({ where: { id } });
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("Error deleting inventory item:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}