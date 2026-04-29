import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { invalidatePattern } from "@/lib/cache";

// PATCH - Update section teacher OR class capacity
export const PATCH = withSchoolAccess(async function PATCH(req, props) {
  const params = await props.params;
  const { classId, schoolId } = params;

  if (!classId || !schoolId) {
    return NextResponse.json({ error: "Missing classId or schoolId" }, { status: 400 });
  }

  try {
    const body = await req.json();

    // If teacherId is provided, update section teacher assignment
    if (body.teacherId !== undefined) {
      const updated = await prisma.section.update({
        where: {
          schoolId,
          id: parseInt(classId, 10)
        },
        data: {
          teachingStaff: body.teacherId ?
          { connect: { userId: body.teacherId } } :
          { disconnect: true }
        }
      });

      // Invalidate classes cache so UI reflects teacher change immediately
      await invalidatePattern('classes:*');
      await invalidatePattern('classes:stats*');

      return NextResponse.json({ success: true, data: updated });
    }

    // If capacity is provided, update class capacity
    if (body.capacity !== undefined) {
      const updated = await prisma.class.update({
        where: {
          id: parseInt(classId, 10),
          schoolId
        },
        data: {
          capacity: body.capacity ? parseInt(body.capacity, 10) : null
        }
      });

      await invalidatePattern('classes:*');
      await invalidatePattern('classes:stats*');

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ error: "No valid update fields provided" }, { status: 400 });
  } catch (error) {
    console.error("❌ Update class/section error:", error);
    return NextResponse.json(
      { error: "Failed to update", message: error.message },
      { status: 500 }
    );
  }
});

// DELETE - Delete an entire class and its sections
export const DELETE = withSchoolAccess(async function DELETE(req, props) {
  const { schoolId, classId } = await props.params;

  try {
    // Delete all sections first (cascade), then the class
    await prisma.$transaction(async (tx) => {
      await tx.section.deleteMany({
        where: { classId: parseInt(classId, 10), schoolId }
      });
      await tx.class.delete({
        where: { id: parseInt(classId, 10), schoolId }
      });
    });

    await invalidatePattern('classes:*');
    await invalidatePattern('classes:stats*');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CLASS_DELETE_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to delete class', message: error.message },
      { status: 500 }
    );
  }
});