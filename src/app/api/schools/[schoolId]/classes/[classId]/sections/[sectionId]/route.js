import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invalidatePattern } from "@/lib/cache";

export const DELETE = withSchoolAccess(async function DELETE(req, props) {
  const { schoolId, classId, sectionId } = await props.params;

  try {
    await prisma.section.delete({
      where: {
        id: parseInt(sectionId, 10),
        classId: parseInt(classId, 10)
      }
    });

    await invalidatePattern('classes:*');
    await invalidatePattern('classes:stats*');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SECTION_DELETE_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to delete section', message: error.message },
      { status: 500 }
    );
  }
});

export const PATCH = withSchoolAccess(async function PATCH(req, props) {
  const { schoolId, classId, sectionId } = await props.params;

  try {
    const body = await req.json();
    const { capacity } = body;

    let data = {};
    if (capacity !== undefined) {
      data.capacity = capacity ? parseInt(capacity, 10) : null;
    }

    const section = await prisma.section.update({
      where: {
        id: parseInt(sectionId, 10),
        classId: parseInt(classId, 10)
      },
      data
    });

    // Invalidate caches
    await invalidatePattern('classes:*');
    await invalidatePattern('classes:stats*');

    return NextResponse.json(section);
  } catch (error) {
    console.error('[SECTION_PATCH]', error);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
});