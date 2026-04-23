import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);

    let {
        classId,
        sectionId,
        academicYearId,
        page = "1",
        limit = "10",
        search = "",
        sortBy = "newest" // newest, oldest, name_asc, name_desc
    } = searchParams;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    const pageNum = Number(page) > 0 ? Number(page) : 1;
    const limitNum = Number(limit) > 0 ? Number(limit) : 10;

    // Handle ALL / undefined filters
    const parsedClassId =
        classId && classId !== "ALL" && classId !== "" ? Number(classId) : undefined;
    const parsedSectionId =
        sectionId && sectionId !== "ALL" && sectionId !== "" ? Number(sectionId) : undefined;

    // Determine sort order
    let orderBy = {};
    switch (sortBy) {
        case "oldest":
            orderBy = { admissionDate: "asc" };
            break;
        case "name_asc":
            orderBy = { name: "asc" };
            break;
        case "name_desc":
            orderBy = { name: "desc" };
            break;
        case "newest":
        default:
            orderBy = { admissionDate: "desc" };
            break;
    }

    try {
        // Auto-resolve active year if no academicYearId provided
        if (!academicYearId) {
            const activeYear = await prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
                select: { id: true },
            });
            if (activeYear) academicYearId = activeYear.id;
        }

        const whereClause = {
            schoolId,
            ...(parsedClassId ? { classId: parsedClassId } : {}),
            ...(parsedSectionId ? { sectionId: parsedSectionId } : {}),
            // Filter by academic year through the class relation
            ...(academicYearId ? { class: { academicYearId } } : {}),
            ...(search
                ? {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { email: { contains: search, mode: "insensitive" } },
                        { admissionNo: { contains: search, mode: "insensitive" } }
                    ]
                }
                : {})
        };

        const cacheKey = generateKey("students", {
            schoolId,
            page: pageNum,
            limit: limitNum,
            search,
            classId: parsedClassId || "ALL",
            sectionId: parsedSectionId || "ALL",
            academicYearId: academicYearId || "ALL",
            sortBy,
        });

        const result = await remember(
            cacheKey,
            async () => {
                const skip = (pageNum - 1) * limitNum;

                const [students, total, activeCount] = await Promise.all([
                    prisma.student.findMany({
                        where: whereClause,
                        include: {
                            user: true,
                            class: { select: { className: true } },
                            section: { select: { name: true } },
                            studentParentLinks: {
                                include: {
                                    parent: {
                                        include: {
                                            user: { select: { email: true, profilePicture: true } }
                                        }
                                    }
                                }
                            }
                        },
                        orderBy,
                        skip,
                        take: limitNum
                    }),
                    prisma.student.count({ where: whereClause }),
                    prisma.student.count({
                        where: { schoolId, user: { status: "ACTIVE" } },
                    }),
                ]);

                return { students, total, activeCount };
            },
            300 // 5 minutes cache
        );

        return NextResponse.json(result);
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Failed to fetch students", errormsg: err.message },
            { status: 500 }
        );
    }
}

export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const body = await req.json();
        const { studentIds } = body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json({ error: "studentIds array is required" }, { status: 400 });
        }

        // Verify all students belong to this school
        const studentRecords = await prisma.student.findMany({
            where: { userId: { in: studentIds }, schoolId },
            select: { userId: true },
        });

        const validIds = studentRecords.map((s) => s.userId);
        if (validIds.length === 0) {
            return NextResponse.json({ error: "No valid students found for this school" }, { status: 404 });
        }

        // Cascade delete within a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Delete student-parent links
            await tx.studentParentLink.deleteMany({
                where: { studentId: { in: validIds } },
            });

            // 2. Delete homework submissions
            await tx.homeworkSubmission.deleteMany({
                where: { studentId: { in: validIds } },
            });

            // 3. Delete exam results
            await tx.examResult.deleteMany({
                where: { studentId: { in: validIds } },
            });

            // 4. Delete student exam attempts
            await tx.studentExamAttempt.deleteMany({
                where: { studentId: { in: validIds } },
            });

            // 5. Delete exam issues
            await tx.examIssue.deleteMany({
                where: { studentId: { in: validIds } },
            });

            // 6. Delete student fee structures
            await tx.studentFeeStructure.deleteMany({
                where: { studentId: { in: validIds } },
            });

            // 7. Delete fee payments
            await tx.feePayment.deleteMany({
                where: { studentId: { in: validIds } },
            });

            // 8. Delete student fees
            await tx.studentFee.deleteMany({
                where: { studentId: { in: validIds } },
            });

            // 9. Delete fee reminders
            await tx.feeReminder.deleteMany({
                where: { studentId: { in: validIds } },
            });

            // 10. Delete attendance records
            await tx.attendance.deleteMany({
                where: { userId: { in: validIds } },
            });

            // 11. Delete transport assignments
            await tx.studentRouteAssignment.deleteMany({
                where: { studentId: { in: validIds } },
            });

            // 12. Delete student records
            await tx.student.deleteMany({
                where: { userId: { in: validIds } },
            });

            // 13. Soft-delete User records
            await tx.user.updateMany({
                where: { id: { in: validIds } },
                data: { deletedAt: new Date(), status: "INACTIVE" },
            });
        });

        // Invalidate student caches
        await invalidatePattern("students*");
        await invalidatePattern("student:*");

        return NextResponse.json({
            success: true,
            message: `${validIds.length} student(s) deleted successfully`,
            deletedCount: validIds.length,
        });
    } catch (error) {
        console.error("❌ Delete students error:", error);
        return NextResponse.json(
            { error: "Failed to delete students", message: error.message },
            { status: 500 }
        );
    }
}
