import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    // 1️⃣ Supabase Auth with robust error handling
    let authData, authError;
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      authData = result.data;
      authError = result.error;
    } catch (err) {
      console.error("🔥 Supabase Auth Failure:", err);
      return NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 });
    }

    if (authError || !authData?.user) {
      console.warn("❌ Invalid credentials or Supabase error:", authError?.message);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

    // 2️⃣ Get user from your Prisma DB
    const user = await prisma.User.findUnique({
      where: { id: userId }, include: {
        role: true, //  this will fetch the Role object along with the user
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // 3️⃣ Resolve schoolId based on user role
    let schoolId = null;
    console.log(user, 'from login');
    switch (user.role.name) {
      case "ADMIN": {
        const admin = await prisma.admin.findUnique({ where: { userId } });
        schoolId = admin?.schoolId;
        break;
      }

      case "TEACHING_STAFF": {
        const teacher = await prisma.teacher.findUnique({ where: { userId } });
        schoolId = teacher?.schoolId;
        break;
      }

      case "NON_TEACHING_STAFF": {
        const staff = await prisma.staff.findUnique({ where: { userId } });
        schoolId = staff?.schoolId;
        break;
      }

      case "STUDENT": {
        const student = await prisma.student.findFirst({ where: { userId } });
        schoolId = student?.schoolId;
        break;
      }

      case "PARENT": {
        const parent = await prisma.parent.findUnique({
          where: { userId },
          include: {
            students: {
              select: {
                schoolId: true,
              },
              take: 1, // Assuming one school
            },
          },
        });

        schoolId = parent?.students?.[0]?.schoolId || null;
        break;
      }

      default:
        return NextResponse.json({ error: "Unsupported role" }, { status: 403 });
    }

    if (!schoolId) {
      return NextResponse.json(
        { error: "No school linked to this user" },
        { status: 400 }
      );
    }

    // ✅ Success response
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        schoolId,
      },
    });

  } catch (err) {
    console.error("❌ Login Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
