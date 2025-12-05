import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req, props) {
  const params = await props.params;
    const { schoolId, sectionId } = params;

    if (!schoolId || !sectionId) {
        return NextResponse.json({ error: "School ID and Section ID are required" }, { status: 400 });
    }

    try {
        // Fetch all students in this section with a roll number
        const students = await prisma.student.findMany({
            where: {
                schoolId,
                sectionId: parseInt(sectionId),
                rollNumber: {
                    not: "" // Exclude empty roll numbers
                }
            },
            select: {
                rollNumber: true
            }
        });

        // Extract roll numbers and convert to integers if possible
        const assignedRollNumbers = students
            .map(s => s.rollNumber)
            .filter(r => !isNaN(parseInt(r))) // Filter out non-numeric roll numbers for calculation
            .map(r => parseInt(r))
            .sort((a, b) => a - b);

        // Find the next available number
        // Strategy: Look for gaps or just max + 1
        // For simplicity and typical school use, max + 1 is usually desired, 
        // but filling gaps is also nice. Let's do max + 1 for now as it's safer/less confusing.
        // Actually, user mentioned "symmetry from 1,2,3", so filling gaps might be expected?
        // "checked fromt that class and section that in section which role number is being empty like in symemtry from 1,2,3"
        // This implies finding the first missing number in the sequence 1, 2, 3...

        let nextRollNumber = 1;
        for (const num of assignedRollNumbers) {
            if (num === nextRollNumber) {
                nextRollNumber++;
            } else if (num > nextRollNumber) {
                // Found a gap
                break;
            }
        }

        return NextResponse.json({
            assignedRollNumbers: students.map(s => s.rollNumber), // Return all assigned (including non-numeric) for validation
            nextRollNumber: String(nextRollNumber)
        });

    } catch (error) {
        console.error("Error fetching roll numbers:", error);
        return NextResponse.json({ error: "Failed to fetch roll numbers" }, { status: 500 });
    }
}
