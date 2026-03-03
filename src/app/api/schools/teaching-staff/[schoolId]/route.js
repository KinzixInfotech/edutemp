import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPagination, apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

export async function GET(req, props) {
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

    let include = { user: true };

    const includeParam = searchParams.get("include");
    if (includeParam) {
        try {
            if (includeParam.trim().startsWith("{")) {
                include = { ...include, ...JSON.parse(includeParam) };
            } else {
                includeParam.split(",").forEach((relation) => {
                    if (relation && relation !== "user") {
                        include[relation] = true;
                    }
                });
            }
        } catch (err) {
            console.warn("Invalid include param:", includeParam);
        }
    }

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
                { contactNumber: { contains: search, mode: "insensitive" } },
            ];
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

        const cacheKey = generateKey("teaching-staff", {
            schoolId,
            include: JSON.stringify(include),
            page,
            limit,
            search,
            designation,
            status,
            sortBy,
        });

        const result = await remember(
            cacheKey,
            async () => {
                const skip = (page - 1) * limit;

                const [staff, total] = await Promise.all([
                    prisma.teachingStaff.findMany({
                        where,
                        include,
                        orderBy,
                        skip,
                        take: limit,
                    }),
                    prisma.teachingStaff.count({ where }),
                ]);

                return { staff, total, page, limit, totalPages: Math.ceil(total / limit) };
            },
            300
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error("❌ Fetch teaching staff error:", error);
        return errorResponse("Failed to fetch teaching staff");
    }
}

export async function DELETE(req, props) {
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
        const staffRecords = await prisma.teachingStaff.findMany({
            where: { userId: { in: staffIds }, schoolId },
            select: { userId: true },
        });

        const validIds = staffRecords.map((s) => s.userId);
        if (validIds.length === 0) {
            return errorResponse("No valid staff members found for this school", 404);
        }

        // Cascade delete within a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Remove SectionSubjectTeacher assignments
            await tx.sectionSubjectTeacher.deleteMany({
                where: { teachingStaffUserId: { in: validIds } },
            });

            // 2. Nullify Class.teachingStaffUserId references
            await tx.class.updateMany({
                where: { teachingStaffUserId: { in: validIds } },
                data: { teachingStaffUserId: null },
            });

            // 3. Delete attendance delegations (original + substitute)
            await tx.attendanceDelegation.deleteMany({
                where: {
                    OR: [
                        { originalTeacherId: { in: validIds } },
                        { substituteTeacherId: { in: validIds } },
                    ],
                },
            });

            // 4. Delete timetable entries
            await tx.timetableEntry.deleteMany({
                where: { teacherId: { in: validIds } },
            });

            // 5. Delete exam hall invigilators
            await tx.examHallInvigilator.deleteMany({
                where: { teacherId: { in: validIds } },
            });

            // 6. Delete teacher shifts
            await tx.teacherShift.deleteMany({
                where: { teacherId: { in: validIds } },
            });

            // 7. Delete exam evaluators
            await tx.examEvaluator.deleteMany({
                where: { teacherId: { in: validIds } },
            });

            // 8. Delete teacher feedbacks
            await tx.teacherFeedback.deleteMany({
                where: { teacherId: { in: validIds } },
            });

            // 9. Delete payroll profile if exists
            await tx.employeePayrollProfile.deleteMany({
                where: { userId: { in: validIds } },
            });

            // 10. Delete TeachingStaff records
            await tx.teachingStaff.deleteMany({
                where: { userId: { in: validIds } },
            });

            // 11. Soft-delete User records
            await tx.user.updateMany({
                where: { id: { in: validIds } },
                data: { deletedAt: new Date(), status: "INACTIVE" },
            });
        });

        // Invalidate caches
        await invalidatePattern("teaching-staff*");

        return NextResponse.json({
            success: true,
            message: `${validIds.length} staff member(s) deleted successfully`,
            deletedCount: validIds.length,
        });
    } catch (error) {
        console.error("❌ Delete teaching staff error:", error);
        return errorResponse("Failed to delete staff members: " + error.message);
    }
}
