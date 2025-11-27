import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req, { params }) {
    const { schoolId } = await params;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        // Find the student with the highest admission number (lexicographically)
        // Note: This assumes admission numbers are somewhat sequential or numeric-ish.
        // If they are purely random strings, this logic might need adjustment.
        // For now, we'll try to find the last created student and increment, or find max.

        // A safer bet for "next" is often count + 1 if they are just numbers, 
        // but if they have prefixes (e.g., ADM-001), we need to parse.
        // Let's assume a simple numeric increment for now based on the count or max.

        // Strategy: Get the latest student by creation time to see the pattern, 
        // OR just count + 1 if we want a simple default.
        // Let's try to find the max admission number if possible.

        // Find the student with the highest admission number
        // We order by admissionNo descending to get the "largest" string.
        // For format ADM-001, ADM-002, this works correctly.
        const lastStudent = await prisma.student.findFirst({
            where: { schoolId },
            orderBy: { admissionNo: 'desc' },
        });

        let nextNo = "ADM-001";

        if (lastStudent && lastStudent.admissionNo) {
            // Try to parse the number part
            const match = lastStudent.admissionNo.match(/ADM-(\d+)/);
            if (match && match[1]) {
                const lastNum = parseInt(match[1], 10);
                nextNo = `ADM-${String(lastNum + 1).padStart(3, '0')}`;
            } else {
                // Fallback if format doesn't match, use count + 1
                const count = await prisma.student.count({
                    where: { schoolId }
                });
                nextNo = `ADM-${String(count + 1).padStart(3, '0')}`;
            }
        } else {
            // No students yet, start with ADM-001
            nextNo = "ADM-001";
        }

        return NextResponse.json({ nextAdmissionNo: nextNo });

    } catch (error) {
        console.error("Error fetching next admission number:", error);
        return NextResponse.json({ error: "Failed to fetch next admission number" }, { status: 500 });
    }
}
