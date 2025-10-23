import prisma from "@/lib/prisma";
// import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import z from "zod";

const schema = z.object({
    role: z.enum(["STUDENT", "TEACHER", "STAFF"]),
    schoolId: z.string(),
});

export async function GET(req) {
    try {
        // const session = await getServerSession();
        // if (!session || session.user.role.name !== "ADMIN") {
        //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        // }

        const { searchParams } = new URL(req.url);
        const role = searchParams.get("role");
        const schoolId = searchParams.get("schoolId");

        const { role: parsedRole, schoolId: parsedSchoolId } = schema.parse({
            role,
            schoolId,
        });

        let users;
        if (parsedRole === "STUDENT") {
            users = await prisma.student.findMany({
                where: { schoolId: schoolId },
                select: {
                    userId: true, name: true, admissionNo: true, user: {
                        select: {
                            profilePicture: true,
                        }
                    }
                },
            });
        } else if (parsedRole === "TEACHER") {
            users = await prisma.teachingStaff.findMany({
                where: { schoolId: parsedSchoolId },
                select: {
                    userId: true, name: true, user: {
                        select: {
                            profilePicture: true,
                        }
                    }
                },
            });
        } else if (parsedRole === "STAFF") {
            users = await prisma.nonTeachingStaff.findMany({
                where: { schoolId: parsedSchoolId },
                select: {
                    userId: true, name: true, user: {
                        select: {
                            profilePicture: true,
                        }
                    }
                },
            });
        }

        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
