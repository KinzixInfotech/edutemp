import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import z from "zod";

const schema = z.object({
    schoolId: z.string(),
    userId: z.string(),
    date: z.string(), //"YYYY-MM-DD"
    status: z.enum(["PRESENT", "ABSENT", "LATE", "HOLIDAY"]),
});

export async function POST(req) {
    try {
        // const session = await getServerSession();
        // if (!session || session.user.role.name !== "ADMIN") {
        //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        // }

        const body = await req.json();
        const { schoolId, userId, date, status } = schema.parse(body);

        // Verify user belongs to the school
        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                schoolId: schoolId,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found in the specified school" },
                { status: 404 }
            );
        }

        const result = await prisma.attendance.upsert({
            where: {
                userId_date: {
                    userId: userId,
                    date: new Date(date),
                },
            },
            update: { status: status },
            create: {
                userId: userId,
                date: new Date(date),
                status: status,
            },
        });

        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}