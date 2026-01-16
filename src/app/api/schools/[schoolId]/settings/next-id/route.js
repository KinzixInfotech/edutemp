
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
            // Find last employee ID from teaching, non-teaching, AND transport staff
            // We need to check all three tables that use employee IDs.

            const lastTeacher = await prisma.teachingStaff.findFirst({
                where: {
                    schoolId,
                    employeeId: { startsWith: prefix },
                },
                orderBy: { employeeId: "desc" },
                select: { employeeId: true },
            });

            const lastNonTeachingStaff = await prisma.nonTeachingStaff.findFirst({
                where: {
                    schoolId,
                    employeeId: { startsWith: prefix },
                },
                orderBy: { employeeId: "desc" },
                select: { employeeId: true },
            });

            const lastTransportStaff = await prisma.transportStaff.findFirst({
                where: {
                    schoolId,
                    employeeId: { startsWith: prefix },
                },
                orderBy: { employeeId: "desc" },
                select: { employeeId: true },
            });

            // Extract numeric parts and find the max
            const extractNumber = (id) => {
                if (!id) return 0;
                const numPart = id.slice(prefix.length).replace(/[^0-9]/g, "");
                return numPart ? parseInt(numPart, 10) : 0;
            };

            const tNum = extractNumber(lastTeacher?.employeeId);
            const ntsNum = extractNumber(lastNonTeachingStaff?.employeeId);
            const tsNum = extractNumber(lastTransportStaff?.employeeId);

            // Find the max number and corresponding ID
            const maxNum = Math.max(tNum, ntsNum, tsNum);
            if (maxNum === tNum && lastTeacher?.employeeId) {
                lastId = lastTeacher.employeeId;
            } else if (maxNum === ntsNum && lastNonTeachingStaff?.employeeId) {
                lastId = lastNonTeachingStaff.employeeId;
            } else if (lastTransportStaff?.employeeId) {
                lastId = lastTransportStaff.employeeId;
            }
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
