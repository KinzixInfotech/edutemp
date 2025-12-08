import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

// GET - Get all students in a class
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId, classId } = params;

        const cacheKey = generateKey('class:students', { schoolId, classId });

        const students = await remember(cacheKey, async () => {
            return await prisma.student.findMany({
                where: {
                    schoolId,
                    classId: parseInt(classId),
                    isAlumni: false
                },
                select: {
                    userId: true,
                    name: true,
                    rollNumber: true,
                    admissionNo: true,
                    admissionDate: true,
                    contactNumber: true,
                    isAlumni: true,
                    email: true,
                    gender: true,
                    user: {
                        select: {
                            name: true
                        }
                    },
                    section: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    rollNumber: 'asc'
                }
            });
        }, 300); // Cache for 5 minutes

        return NextResponse.json(students);
    } catch (error) {
        console.error("Error fetching class students:", error);
        return NextResponse.json(
            { error: "Failed to fetch students" },
            { status: 500 }
        );
    }
}
