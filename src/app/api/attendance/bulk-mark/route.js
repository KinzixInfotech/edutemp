// import { prisma } from "@/lib/prisma";
import prisma from "@/lib/prisma";
// import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import z from "zod";

const schema = z.array(
    z.object({
        userId: z.string(),
        date: z.string().datetime(),
        status: z.enum(["PRESENT", "ABSENT", "LATE", "HOLIDAY"]),
    })
);

export async function POST(req) {
    try {
        // const session = await getServerSession();
        // if (!session || session.user.role.name !== "ADMIN") {
        //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        // }

        const body = await req.json();
        const data = schema.parse(body);

        const results = await Promise.all(
            data.map((item) =>
                prisma.attendance.upsert({
                    where: {
                        userId_date: {
                            userId: item.userId,
                            date: new Date(item.date),
                        },
                    },
                    update: { status: item.status },
                    create: {
                        userId: item.userId,
                        date: new Date(item.date),
                        status: item.status,
                    },
                })
            )
        );

        return NextResponse.json(results, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
