// /api/students/route.js - For fetching all students with filters

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");
        const classId = parseInt(searchParams.get("classId")) || undefined;
        const sectionId = searchParams.get("sectionId") || undefined;
        const admissionNumber = searchParams.get("admissionNumber") || undefined;

        if (!schoolId) {
            return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
        }

        const where = {
            schoolId,
            ...(classId && { classId }),
            ...(sectionId && { sectionId }),
            ...(admissionNumber && { admissionNumber: { contains: admissionNumber, mode: "insensitive" } }),
        };
        const students = await prisma.student.findMany({
            where,
            include: {
                user: { select: { name: true } },
                class: {
                    select: {
                        className: true,
                        sections: {
                            select: { id: true, name: true },
                        },
                    },
                },
                StudentFeeStructure: true, 
            },
            orderBy: { user: { name: "asc" } },
        });


        return NextResponse.json(students);
    } catch (err) {
        console.error("Fetch Students API error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}