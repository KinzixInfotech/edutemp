import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPagination, apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  const { schoolId } = params;
  const { searchParams } = new URL(req.url);

  if (!schoolId) {
    return errorResponse("Missing schoolId", 400);
  }

  const search = searchParams.get("search")?.trim() || "";
  const designation = searchParams.get("designation") || "ALL";
  const status = searchParams.get("status") || "ALL";
  const sortBy = searchParams.get("sortBy") || "newest";

  try {
    const { page, limit } = getPagination(req);

    // Build where clause
    const where = { schoolId };

    // Server-side search
    if (search) {
      where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { employeeId: { contains: search, mode: "insensitive" } },
      { contactNumber: { contains: search, mode: "insensitive" } }];

    }

    // Designation filter
    if (designation && designation !== "ALL") {
      where.designation = designation;
    }

    // Status filter (on related user)
    if (status && status !== "ALL") {
      where.user = { status };
    }

    // Sort order
    let orderBy;
    switch (sortBy) {
      case "oldest":
        orderBy = { user: { createdAt: "asc" } };
        break;
      case "name_asc":
        orderBy = { name: "asc" };
        break;
      case "name_desc":
        orderBy = { name: "desc" };
        break;
      case "newest":
      default:
        orderBy = { user: { createdAt: "desc" } };
        break;
    }

    const cacheKey = generateKey("non-teaching-staff", {
      schoolId,
      page,
      limit,
      search,
      designation,
      status,
      sortBy
    });

    const result = await remember(
      cacheKey,
      async () => {
        const skip = (page - 1) * limit;

        const [staff, total, activeCount, designations] = await Promise.all([
        prisma.NonTeachingStaff.findMany({
          where,
          include: { user: true },
          orderBy,
          skip,
          take: limit
        }),
        prisma.NonTeachingStaff.count({ where }),
        prisma.NonTeachingStaff.count({
          where: { schoolId, user: { status: "ACTIVE" } }
        }),
        prisma.NonTeachingStaff.findMany({
          where: { schoolId },
          select: { designation: true },
          distinct: ["designation"]
        })]
        );

        const uniqueDesignations = designations.filter((d) => d.designation).length;

        return { staff, total, page, limit, totalPages: Math.ceil(total / limit), activeCount, uniqueDesignations };
      },
      300
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Fetch non teaching staff error:", error);
    return errorResponse("Failed to fetch non teaching staff");
  }
});

export const DELETE = withSchoolAccess(async function DELETE(req, props) {
  const params = await props.params;
  const { schoolId } = params;

  if (!schoolId) {
    return errorResponse("Missing schoolId", 400);
  }

  try {
    const body = await req.json();
    const { staffIds } = body;

    if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
      return errorResponse("staffIds array is required", 400);
    }

    // Verify all staff belong to this school
    const staffRecords = await prisma.NonTeachingStaff.findMany({
      where: { userId: { in: staffIds }, schoolId },
      select: { userId: true }
    });

    const validIds = staffRecords.map((s) => s.userId);
    if (validIds.length === 0) {
      return errorResponse("No valid staff members found for this school", 404);
    }

    // Cascade delete within a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete payroll profile if exists
      await tx.employeePayrollProfile.deleteMany({
        where: { userId: { in: validIds } }
      });

      // 2. Delete NonTeachingStaff records
      await tx.nonTeachingStaff.deleteMany({
        where: { userId: { in: validIds } }
      });

      // 3. Soft-delete User records
      await tx.user.updateMany({
        where: { id: { in: validIds } },
        data: { deletedAt: new Date(), status: "INACTIVE" }
      });
    });

    // Invalidate caches
    await invalidatePattern("non-teaching-staff*");

    return NextResponse.json({
      success: true,
      message: `${validIds.length} staff member(s) deleted successfully`,
      deletedCount: validIds.length
    });
  } catch (error) {
    console.error("❌ Delete non teaching staff error:", error);
    return errorResponse("Failed to delete staff members: " + error.message);
  }
});