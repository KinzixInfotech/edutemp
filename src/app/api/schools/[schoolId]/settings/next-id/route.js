
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "student" or "employee"

    if (!type) {
        return NextResponse.json({ error: "Type is required" }, { status: 400 });
    }

    try {
        const settings = await prisma.schoolSettings.findUnique({
            where: { schoolId },
        });

        const prefix = type === "student"
            ? (settings?.admissionNoPrefix || "ADM")
            : (settings?.employeeIdPrefix || "EMP");

        let lastId = null;

        if (type === "student") {
            // Find last student admission number starting with prefix
            const lastStudent = await prisma.student.findFirst({
                where: {
                    schoolId,
                    admissionNo: { startsWith: prefix },
                },
                orderBy: { admissionNo: "desc" },
                select: { admissionNo: true },
            });
            lastId = lastStudent?.admissionNo;
        } else if (type === "employee") {
            // Find last employee ID from teaching OR non-teaching staff
            // This is trickier because they are in different tables.
            // We will check both.

            const lastTeacher = await prisma.teachingStaff.findFirst({
                where: {
                    schoolId,
                    employeeId: { startsWith: prefix },
                },
                orderBy: { employeeId: "desc" },
                select: { employeeId: true },
            });

            const lastStaff = await prisma.nonTeachingStaff.findFirst({
                where: {
                    schoolId,
                    employeeId: { startsWith: prefix },
                },
                orderBy: { employeeId: "desc" },
                select: { employeeId: true },
            });

            // Compare to find the "max"
            const tId = lastTeacher?.employeeId || "";
            const sId = lastStaff?.employeeId || "";

            // Simple string comparison might fail for "EMP10" vs "EMP2" (EMP2 is > EMP10 alphabetically but not numerically)
            // Ideally we extract numbers.
            lastId = tId > sId ? tId : sId;

            // Better numeric extraction if possible, but for simple 'desc' sort above, Prisma does string sort.
            // If user uses consistent padding (EMP001), string sort works.
        }

        // Generate Next ID
        // Assumes format: PREFIXXX... or PREFIX-XXX...
        // We will try to extract the last number.

        let nextNumber = 1;
        if (lastId) {
            // Remove prefix (case insensitive check? assuming matches for now)
            const numPart = lastId.slice(prefix.length).replace(/[^0-9]/g, "");
            if (numPart) {
                nextNumber = parseInt(numPart, 10) + 1;
            }
        }

        // Pad with zeros to at least 3 digits, or length of previous number
        const padding = Math.max(3, lastId ? (lastId.length - prefix.length) : 3);
        const nextIdStr = `${prefix}${String(nextNumber).padStart(padding, "0")}`;

        return NextResponse.json({ nextId: nextIdStr });
    } catch (error) {
        console.error("Error generating next ID:", error);
        return NextResponse.json({ error: "Failed to generate ID" }, { status: 500 });
    }
}
