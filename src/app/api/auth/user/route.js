import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn'],
});
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get("email");

        if (!email) {
            return NextResponse.json({ error: "Missing email" }, { status: 400 });
        }
        const start = performance.now();

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                admin: true,
                teacher: true,
                staff: true,
                student: true,
            },
        });



        const end = performance.now();
        console.log(`🕒 Supabase Query took ${end - start} ms`);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const schoolId =
            user.admin?.schoolId ||
            user.teacher?.schoolId ||
            user.staff?.schoolId ||
            user.student?.schoolId;

        return NextResponse.json({
            id: user.id,
            email: user.email,
            role: user.role,
            schoolId,
        });
    } catch (err) {
        console.error("❌ Error in /api/auth/user:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
