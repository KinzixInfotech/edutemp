import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invalidatePattern } from "@/lib/cache";

// PATCH: Update copy details (e.g., generate barcode, change condition)
export const PATCH = withSchoolAccess(async function PATCH(req, props) {
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
      include: {
        book: {
          select: { schoolId: true }
        }
      }
    });

    if (updatedCopy.book?.schoolId) {
      await invalidatePattern(`library:books:*schoolId:${updatedCopy.book.schoolId}*`);
      await invalidatePattern(`library:stats:*schoolId:${updatedCopy.book.schoolId}*`);
    }

    return NextResponse.json(updatedCopy);
  } catch (error) {
    console.error("Error updating copy:", error);
    return NextResponse.json(
      { error: "Failed to update copy" },
      { status: 500 }
    );
  }
});

// DELETE: Delete a copy
export const DELETE = withSchoolAccess(async function DELETE(req, props) {
  const params = await props.params;
  try {
    const { copyId } = params;

    // Check for active transactions
    const activeTransaction = await prisma.libraryTransaction.findFirst({
      where: {
        copyId: copyId,
        status: "ISSUED"
      }
    });

    if (activeTransaction) {
      return NextResponse.json(
        { error: "Cannot delete copy that is currently issued." },
        { status: 400 }
      );
    }

    const deletedCopy = await prisma.libraryBookCopy.delete({
      where: { id: copyId },
      include: {
        book: {
          select: { schoolId: true }
        }
      }
    });

    if (deletedCopy.book?.schoolId) {
      await invalidatePattern(`library:books:*schoolId:${deletedCopy.book.schoolId}*`);
      await invalidatePattern(`library:stats:*schoolId:${deletedCopy.book.schoolId}*`);
    }

    return NextResponse.json({ message: "Copy deleted successfully" });
  } catch (error) {
    console.error("Error deleting copy:", error);
    return NextResponse.json(
      { error: "Failed to delete copy" },
      { status: 500 }
    );
  }
});