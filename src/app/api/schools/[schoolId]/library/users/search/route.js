import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(request.url);
        const query = searchParams.get("query") || "";
        const type = searchParams.get("type") || "ALL"; // ALL, STUDENT, TEACHER, STAFF
        const classId = searchParams.get("classId");
        const sectionId = searchParams.get("sectionId");

        let results = [];

        // Search Students
        if (type === "ALL" || type === "STUDENT") {
            const whereClause = {
                schoolId,
                ...(classId && { classId: parseInt(classId) }),
                ...(sectionId && { sectionId: parseInt(sectionId) }),
            };

            if (query && query.length >= 2) {
                whereClause.OR = [
                    { name: { contains: query, mode: "insensitive" } },
                    { admissionNo: { contains: query, mode: "insensitive" } },
                    { rollNumber: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                    { contactNumber: { contains: query, mode: "insensitive" } },
                    {
                        class: {
                            className: { contains: query, mode: "insensitive" },
                        },
                    },
                ];
            } else if (!classId && !sectionId) {
                // If no query and no filters, don't return all students unless specifically requested or limited
                // But for "recent" fallback, we might just return empty or let frontend handle it.
                // However, user asked for "recent searched student" as fallback.
                // Since we can't track "searched" easily without a new table, we'll rely on frontend for "recent searched".
                // But if filters are applied, we should return results.
                // If NO query and NO filters, we return empty for students to avoid fetching thousands.
                whereClause.id = "nothing_to_match"; // Hack to return empty if no criteria
            }

            // If we have a query OR filters, fetch data
            if ((query && query.length >= 2) || classId || sectionId) {
                const students = await prisma.student.findMany({
                    where: whereClause,
                    include: {
                        class: true,
                        section: true,
                        user: {
                            select: {
                                profilePicture: true,
                            },
                        },
                    },
                    take: 20,
                });

                results.push(
                    ...students.map((s) => ({
                        id: s.userId,
                        name: s.name,
                        type: "STUDENT",
                        identifier: s.admissionNo,
                        details: `Class: ${s.class.className} - ${s.section.name} | Roll: ${s.rollNumber}`,
                        email: s.email,
                        image: s.user?.profilePicture,
                    }))
                );
            }
        }

        // Search Teachers
        if (type === "ALL" || type === "TEACHER") {
            const whereClause = { schoolId };

            if (query && query.length >= 2) {
                whereClause.OR = [
                    { name: { contains: query, mode: "insensitive" } },
                    { employeeId: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                    { contactNumber: { contains: query, mode: "insensitive" } },
                ];
            }

            // If query is empty, we still return teachers (ordered by old)
            const teachers = await prisma.teachingStaff.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: {
                            profilePicture: true,
                            createdAt: true,
                        },
                    },
                    department: true,
                },
                orderBy: {
                    user: {
                        createdAt: "asc", // Oldest first
                    },
                },
                take: 20,
            });

            results.push(
                ...teachers.map((t) => ({
                    id: t.userId,
                    name: t.name,
                    type: "TEACHER",
                    identifier: t.employeeId,
                    details: `Dept: ${t.department?.name || "N/A"} | Designation: ${t.designation}`,
                    email: t.email,
                    image: t.user?.profilePicture,
                }))
            );
        }

        // Search Non-Teaching Staff
        if (type === "ALL" || type === "STAFF") {
            const whereClause = { schoolId };

            if (query && query.length >= 2) {
                whereClause.OR = [
                    { name: { contains: query, mode: "insensitive" } },
                    { employeeId: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                    { contactNumber: { contains: query, mode: "insensitive" } },
                ];
            }

            const staff = await prisma.nonTeachingStaff.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: {
                            profilePicture: true,
                            createdAt: true,
                        },
                    },
                    department: true,
                },
                orderBy: {
                    user: {
                        createdAt: "asc", // Oldest first
                    },
                },
                take: 20,
            });

            results.push(
                ...staff.map((s) => ({
                    id: s.userId,
                    name: s.name,
                    type: "STAFF",
                    identifier: s.employeeId,
                    details: `Dept: ${s.department?.name || "N/A"} | Designation: ${s.designation}`,
                    email: s.email,
                    image: s.user?.profilePicture,
                }))
            );
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error("Error searching users:", error);
        return NextResponse.json(
            { error: "Failed to search users" },
            { status: 500 }
        );
    }
}
