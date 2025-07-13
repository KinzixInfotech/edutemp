import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get("email");

        if (!email) {
            return NextResponse.json({ error: "Missing email" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        let schoolId = null;

        switch (user.role) {
            case "ADMIN":
                const admin = await prisma.admin.findUnique({ where: { userId: user.id } });
                schoolId = admin?.schoolId;
                break;

            case "TEACHING_STAFF":
                const teacher = await prisma.teacher.findUnique({ where: { userId: user.id } });
                schoolId = teacher?.schoolId;
                break;

            case "NON_TEACHING_STAFF":
                const staff = await prisma.staff.findUnique({ where: { userId: user.id } });
                schoolId = staff?.schoolId;
                break;

            case "STUDENT":
                const student = await prisma.student.findFirst({ where: { userId: user.id } });
                schoolId = student?.schoolId;
                break;

            case "PARENT":
                // You may handle parent logic here later
                break;
        }

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
