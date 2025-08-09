import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req) {
    try {
        const body = await req.json();
        const { id, role, updates } = body; // `updates` is an object of { fieldName: value }

        if (!id || !role || !updates) {
            return NextResponse.json({ error: "Missing required data" }, { status: 400 });
        }

        let updatedUser;

        switch (role) {
            case "STUDENT":
                updatedUser = await prisma.student.update({
                    where: { userId: id },
                    data: updates,
                });
                break;

            case "TEACHER":
                updatedUser = await prisma.teacher.update({
                    where: { userId: id },
                    data: updates,
                });
                break;

            case "ADMIN":
                updatedUser = await prisma.admin.update({
                    where: { userId: id },
                    data: updates,
                });
                break;

            case "SUPER_ADMIN":
                updatedUser = await prisma.user.update({
                    where: { id },
                    data: updates,
                });
                break;

            default:
                return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        return NextResponse.json({ message: "Profile updated successfully", updatedUser });
    } catch (err) {
        console.error("❌ Error updating user:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get("email");

        if (!email) {
            return NextResponse.json({ error: "Missing email" }, { status: 400 });
        }

        const start = performance.now();

        // Step 1: Fetch user only (without relations)
        const user = await prisma.User.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                role: true,
                schoolId: true,
                name: true,
                profilePicture: true,
                school: {
                    select: {
                        id: true,
                        name: true,
                        domain: true,
                    },
                },
            },
        });
        console.log(user, 'from api');

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        let schoolId = null;
        let studentdatafull = null;
        let profilePicture = user?.profilePicture || null;
        let classs = null;
        let section = null;
        let school = null;
        let name = user?.name || null;

        // Step 2: Fetch schoolId from corresponding model based on role
        switch (user.role.name) {
            case "ADMIN":
                const admin = await prisma.admin.findUnique({
                    where: { userId: user.id },
                    select: {
                        schoolId: true,
                        school: true,
                    },
                });
                schoolId = admin?.schoolId;
                school = admin?.school;
                break;
            case "TEACHING_STAFF":
                const teacher = await prisma.teacher.findUnique({
                    where: { userId: user.id },
                    select: { schoolId: true },
                });
                schoolId = teacher?.schoolId;
                break;
            case "NON_TEACHING_STAFF":
                const staff = await prisma.staff.findUnique({
                    where: { userId: user.id },
                    select: { schoolId: true },
                });
                schoolId = staff?.schoolId;
                break;
            case "STUDENT":
                const student = await prisma.student.findUnique({
                    where: { userId: user.id },
                    include: {
                        class: true,
                        section: true,
                    }

                })
                schoolId = student?.schoolId;
                name = student?.name;
                studentdatafull = student,
                    classs = student?.class;
                section = student?.section;
                // profilePicture = student?.profilePicture;
                break;
        }
        const end = performance.now();
        console.log(`🕒 Query took ${end - start, profilePicture} ms`);

        return NextResponse.json({
            id: user.id,
            email: user.email,
            role: user.role,
            schoolId,
            school,
            name,
            classs,
            studentdatafull,
            section,
            profilePicture,
        });
    } catch (err) {
        console.error("❌ Error in /api/auth/user:", err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}
