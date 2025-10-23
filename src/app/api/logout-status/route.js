import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req) {
    try {
        const { userId } = await req.json();

        await prisma.user.update({
            where: { id: userId },
            data: { status: "INACTIVE" },
        });

        return NextResponse.json({ message: "Status set to INACTIVE" });
    } catch (err) {
        return NextResponse.json(
            { error: "Failed to update user status" },
            { status: 500 }
        );
    }
}
