import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

// Parse incoming login body
const loginSchema = z.object({
  email: z.string().email(),
  // password: z.string().min(6),
  userId: z.string(),
  schoolCode: z.string().optional(),
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, schoolCode } = loginSchema.parse(body);

    // Step 1️⃣: Login via Supabase
    // const result = await supabase.auth.signInWithPassword({ email, password });
    // const authData = result.data;
    // const authError = result.error;

    // if (authError || !authData?.user) {
    //   return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    // }

    // const userId = authData.user.id;

    // Step 2️⃣: Fetch user from Prisma DB
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      await supabase.auth.signOut(); // Cleanup
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    // Step 3️⃣: Decide based on schoolCode presence
    const isSchoolLogin = Boolean(schoolCode?.trim());

    // ✅ If school login — only allow school roles
    const schoolRoles = ["ADMIN", "TEACHING_STAFF", "NON_TEACHING_STAFF", "STUDENT", "PARENT", "LIBRARIAN", "ACCOUNTANT", "DRIVER", "CONDUCTOR"];
    if (isSchoolLogin && !schoolRoles.includes(user.role.name)) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Only school users can login here" }, { status: 403 });
    }

    // ✅ If no schoolCode — only SUPER_ADMIN can login
    if (!isSchoolLogin && user.role.name !== "SUPER_ADMIN") {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Only super admins can login without school code" }, { status: 403 });
    }

    // Step 4️⃣: Set user ACTIVE
    await prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
    });

    // Step 5️⃣: Resolve schoolId (if school user)
    let schoolId = null;

    switch (user.role.name) {
      case "ADMIN":
        schoolId = (await prisma.admin.findUnique({ where: { userId } }))?.schoolId;
        break;
      case "TEACHING_STAFF":
        schoolId = (await prisma.teachingStaff.findUnique({ where: { userId } }))?.schoolId;
        break;
      case "NON_TEACHING_STAFF":
        schoolId = (await prisma.nonTeachingStaff.findUnique({ where: { userId } }))?.schoolId;
        break;
      case "STUDENT":
        schoolId = (await prisma.student.findFirst({ where: { userId } }))?.schoolId;
        break;
      case "PARENT":
        const parent = await prisma.parent.findUnique({
          where: { userId },
          include: { studentLinks: { select: { student: { select: { schoolId: true } } }, take: 1 } },
        });
        schoolId = parent?.studentLinks?.[0]?.student?.schoolId || null;
        break;
      case "LIBRARIAN":
        schoolId = (await prisma.librarian.findUnique({ where: { userId } }))?.schoolId;
        break;
      case "ACCOUNTANT":
        schoolId = (await prisma.accountant.findUnique({ where: { userId } }))?.schoolId;
        break;
      case "DRIVER":
      case "CONDUCTOR":
        schoolId = (await prisma.transportStaff.findUnique({ where: { userId } }))?.schoolId;
        break;
    }

    if (isSchoolLogin && !schoolId) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "School not linked to user" }, { status: 400 });
    }

    // ✅ All good
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        schoolId,
      },
    });

  } catch (err) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
