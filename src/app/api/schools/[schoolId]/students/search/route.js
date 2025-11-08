import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    // Simple UUID validator
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(query);

    try {
        const students = await prisma.student.findMany({
            where: {
                schoolId,
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
                admissionNo:true,
                email: true,
                class: true,
                // profilePhoto: true,
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
