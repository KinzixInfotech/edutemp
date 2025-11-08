import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"


export async function GET(request, props) {
    const params = await props.params;
    const { schoolId } = params;
    try {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            include: {
                admins: {
                    include: {
                        User: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                profilePicture: true,
                                status: true,
                                createdAt: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json({ school })
    } catch (err) {
        console.error("[PROFILES_FETCH]", err)
        return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
    }
}
