import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    let academicYearId = searchParams.get("academicYearId");

    // Simple UUID validator
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(query);

    try {
        // Auto-resolve active year
        if (!academicYearId) {
            const activeYear = await prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
                select: { id: true },
            });
            if (activeYear) academicYearId = activeYear.id;
        }

        const students = await prisma.student.findMany({
            where: {
                schoolId,
                ...(academicYearId ? { class: { academicYearId } } : {}),
                OR: [
                    {
                        name: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                    {
                        email: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                    {
                        admissionNo: {
                            contains: query,
                            mode: "insensitive",
                        },
                    },
                    ...(isUUID
                        ? [
                            {
                                user: {
                                    id: query,
                                },
                            },
                        ]
                        : []),
                ],
            },
            select: {
                userId: true,
                name: true,
                admissionNo: true,
                email: true,
                class: {
                    select: {
                        className: true,
                    }
                },
                section: {
                    select: {
                        name: true,
                        teachingStaff: {
                            select: {
                                name: true,
                            }
                        }
                    }
                },
                user: {
                    select: {
                        profilePicture: true,
                    }
                },
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json({ students });
    } catch (err) {
        console.error("[STUDENT_SEARCH]", err);
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }
}
