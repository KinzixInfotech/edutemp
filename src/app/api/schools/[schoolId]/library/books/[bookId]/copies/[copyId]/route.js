import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH: Update copy details (e.g., generate barcode, change condition)
export async function PATCH(req, props) {
    const params = await props.params;
    try {
        const { copyId } = params;
        const body = await req.json();

        // Prevent updating to duplicate barcode if passed manually, 
        // but normally we generate safely. 
        // Prisma will throw unique constraint error if handled.

        const updatedCopy = await prisma.libraryBookCopy.update({
            where: { id: copyId },
            data: body,
        });

        return NextResponse.json(updatedCopy);
    } catch (error) {
        console.error("Error updating copy:", error);
        return NextResponse.json(
            { error: "Failed to update copy" },
            { status: 500 }
        );
    }
}

// DELETE: Delete a copy
export async function DELETE(req, props) {
    const params = await props.params;
    try {
        const { copyId } = params;

        // Check for active transactions
        const activeTransaction = await prisma.libraryTransaction.findFirst({
            where: {
                copyId: copyId,
                status: "ISSUED",
            },
        });

        if (activeTransaction) {
            return NextResponse.json(
                { error: "Cannot delete copy that is currently issued." },
                { status: 400 }
            );
        }

        await prisma.libraryBookCopy.delete({
            where: { id: copyId },
        });

        return NextResponse.json({ message: "Copy deleted successfully" });
    } catch (error) {
        console.error("Error deleting copy:", error);
        return NextResponse.json(
            { error: "Failed to delete copy" },
            { status: 500 }
        );
    }
}
