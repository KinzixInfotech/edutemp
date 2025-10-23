// pages/api/inventory/transactions.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");
    const itemId = searchParams.get("itemId");

    try {
        const where = {};
        if (schoolId) where.item = { schoolId };
        if (itemId) where.itemId = itemId;

        const transactions = await prisma.inventoryTransaction.findMany({
            where,
            include: { item: true },
        });
        return NextResponse.json(transactions, { status: 200 });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { itemId, transactionType, quantity, handledById, handledByName, status } = body;

        if (!itemId || !transactionType || !quantity || !handledById || !handledByName || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!["ISSUE", "RETURN", "ADJUSTMENT", "PURCHASE"].includes(transactionType)) {
            return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
        }

        if (!["COMPLETED", "PENDING", "LOST", "DAMAGED"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const newTransaction = await prisma.inventoryTransaction.create({
            data: { ...body, date: new Date() },
        });

        const updateData =
            transactionType === "ISSUE" || transactionType === "ADJUSTMENT"
                ? { quantity: { decrement: quantity } }
                : transactionType === "RETURN" || transactionType === "PURCHASE"
                    ? { quantity: { increment: quantity } }
                    : {};

        if (Object.keys(updateData).length) {
            await prisma.inventoryItem.update({
                where: { id: itemId },
                data: updateData,
            });
        }

        return NextResponse.json(newTransaction, { status: 201 });
    } catch (error) {
        console.error("Error creating transaction:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, transactionType, quantity, status } = body;

        if (!id || !transactionType || !quantity || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!["ISSUE", "RETURN", "ADJUSTMENT", "PURCHASE"].includes(transactionType)) {
            return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
        }

        if (!["COMPLETED", "PENDING", "LOST", "DAMAGED"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const updatedTransaction = await prisma.inventoryTransaction.update({
            where: { id },
            data: { transactionType, quantity, status },
        });

        return NextResponse.json(updatedTransaction, { status: 200 });
    } catch (error) {
        console.error("Error updating transaction:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
        }

        await prisma.inventoryTransaction.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Transaction deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
