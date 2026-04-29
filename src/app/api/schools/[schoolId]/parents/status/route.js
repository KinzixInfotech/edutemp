import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { invalidatePattern } from "@/lib/cache";

export const PATCH = withSchoolAccess(async function PATCH(req, props) {
  const params = await props.params;
  const { schoolId } = params;
  const { parentIds, status } = await req.json();

  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    // Get parent userIds
    const parents = await prisma.parent.findMany({
      where: { id: { in: parentIds }, schoolId },
      select: { userId: true }
    });

    const userIds = parents.map((p) => p.userId);

    // Update user status
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { status }
    });

    // Invalidate all parent list caches + profile caches
    await invalidatePattern('parents:list*');
    await invalidatePattern('parent:profile*');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PARENTS_STATUS]", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
});