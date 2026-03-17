import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { invalidatePattern } from "@/lib/cache";

export async function PATCH(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const { studentIds, status } = await req.json();

        if (!["ACTIVE", "INACTIVE"].includes(status)) {
            return NextResponse.json({ error: "Invalid status. Must be ACTIVE or INACTIVE" }, { status: 400 });
        }

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json({ error: "studentIds array is required" }, { status: 400 });
        }

        // Verify students belong to this school
        const students = await prisma.student.findMany({
            where: { userId: { in: studentIds }, schoolId },
            select: { userId: true },
        });

        const validIds = students.map((s) => s.userId);
        if (validIds.length === 0) {
            return NextResponse.json({ error: "No valid students found for this school" }, { status: 404 });
        }

        // Update user status
        await prisma.user.updateMany({
            where: { id: { in: validIds } },
            data: { status },
        });

        // Invalidate student caches
        await invalidatePattern("students*");
        await invalidatePattern("student:*");

        return NextResponse.json({
            success: true,
            message: `${validIds.length} student(s) ${status === 'INACTIVE' ? 'inactivated' : 'activated'} successfully`,
            updatedCount: validIds.length,
        });
    } catch (error) {
        console.error("❌ Update students status error:", error);
        return NextResponse.json(
            { error: "Failed to update student status", message: error.message },
            { status: 500 }
        );
    }
}
