// /api/students/route.js - For fetching all students with filters

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { paginate, getPagination, apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey } from "@/lib/cache";

// export async function GET(req) {
//     try {
//         const { searchParams } = new URL(req.url);
//         const schoolId = searchParams.get("schoolId");
//         const classId = parseInt(searchParams.get("classId")) || undefined;
//         const sectionId = searchParams.get("sectionId") || undefined;
//         const admissionNumber = searchParams.get("admissionNumber") || undefined;

//         if (!schoolId) {
//             return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
//         }

//         const where = {
//             schoolId,
//             ...(classId && { classId }),
//             ...(sectionId && { sectionId }),
//             ...(admissionNumber && { admissionNumber: { contains: admissionNumber, mode: "insensitive" } }),
//         };
//         const students = await prisma.student.findMany({
//             where,
//             include: {
//                 user: { select: { name: true } },
//                 class: {
//                     select: {
//                         className: true,
//                         sections: {
//                             select: { id: true, name: true },
//                         },
//                     },
//                 },
//                 StudentFeeStructure: true, 
//             },
//             orderBy: { user: { name: "asc" } },
//         });


//         return NextResponse.json(students);
//     } catch (err) {
//         console.error("Fetch Students API error:", err);
//         return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
//     }
// }
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");
        const classIdParam = searchParams.get("classId");
        const sectionIdParam = searchParams.get("sectionId");
        const admissionNumber = searchParams.get("admissionNumber") || undefined;

        const classId = classIdParam ? parseInt(classIdParam) : undefined;
        const sectionId = sectionIdParam ? parseInt(sectionIdParam) : undefined;

        if (!schoolId) {
            return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
        }

        const { page, limit, skip } = getPagination(req);

        const where = {
            schoolId,
            ...(classId && { classId }),
            ...(sectionId && { sectionId }),
            ...(admissionNumber && { admissionNumber: { contains: admissionNumber, mode: "insensitive" } }),
        };

        const cacheKey = generateKey('students', { schoolId, classId, sectionId, admissionNumber, page, limit });

        const result = await remember(cacheKey, async () => {
            return await paginate(prisma.student, {
                where,
                include: {
                    user: {
                        select: {
                            name: true,
                            profilePicture: true,
                        }
                    },
                    class: {
                        select: {
                            className: true,
                            sections: { select: { id: true, name: true } },
                        },
                    },
                    StudentFeeStructure: true,
                },
                orderBy: { user: { name: "asc" } },
            }, page, limit);
        }, 300); // Cache for 5 mins

        // Return data array for backward compatibility
        return apiResponse(result.data);
    } catch (err) {
        console.error("Fetch Students API error:", err);
        return errorResponse(err.message || "Internal server error");
    }
}
