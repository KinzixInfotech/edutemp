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

    // check the user's role
    const userRole = user.role?.name;
    console.log(`User role: ${userRole}`);

    // If SUPER_ADMIN - only allow without school code
    if (userRole === "SUPER_ADMIN") {
      if (loginSchoolCode) {
        return NextResponse.json({ error: "Super admins should not use school code." }, { status: 403 });
      }
      console.log("Super Admin login successful.");
      // For SUPER_ADMIN, schoolId is null
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          schoolId: null,
        },
      });
    }

    // For school-specific roles, schoolCode is required
    // Permitted roles: ADMIN, TEACHING_STAFF, NON_TEACHING_STAFF, STUDENT, PARENT, LIBRARIAN, ACCOUNTANT, DIRECTOR, PRINCIPAL, DRIVER, CONDUCTOR
    const permittedRoles = [
      "ADMIN",
      "TEACHING_STAFF",
      "NON_TEACHING_STAFF",
      "STUDENT",
      "PARENT",
      "LIBRARIAN",
      "ACCOUNTANT",
      "DIRECTOR",
      "PRINCIPAL",
      "DRIVER",
      "CONDUCTOR",
    ];
    if (!permittedRoles.includes(userRole)) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Role not permitted for school login." }, { status: 403 });
    }
    if (!loginSchoolCode) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "School code required for this role." }, { status: 400 });
    }

    // Step 3️⃣: Set user ACTIVE
    await prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
    });

    // Step 4️⃣: Resolve schoolId based on user role
    let userSchoolId = null;

    switch (userRole) {
      case "ADMIN":
        userSchoolId = (await prisma.admin.findUnique({ where: { userId: user.id } }))?.schoolId;
        break;
      case "TEACHING_STAFF":
        userSchoolId = (await prisma.teachingStaff.findUnique({ where: { userId: user.id } }))?.schoolId;
        break;
      case "NON_TEACHING_STAFF":
        userSchoolId = (await prisma.nonTeachingStaff.findUnique({ where: { userId: user.id } }))?.schoolId;
        break;
      case "STUDENT":
        userSchoolId = (await prisma.student.findFirst({ where: { userId: user.id } }))?.schoolId;
        break;
      case "PARENT":
        const parent = await prisma.parent.findUnique({
          where: { userId: user.id },
          include: { studentLinks: { select: { student: { select: { schoolId: true } } }, take: 1 } },
        });
        userSchoolId = parent?.studentLinks?.[0]?.student?.schoolId || null;
        break;
      case "LIBRARIAN":
        userSchoolId = (await prisma.librarian.findUnique({ where: { userId: user.id } }))?.schoolId;
        break;
      case "ACCOUNTANT":
        userSchoolId = (await prisma.accountant.findUnique({ where: { userId: user.id } }))?.schoolId;
        break;
      case "DIRECTOR":
        userSchoolId = (await prisma.director.findUnique({ where: { userId: user.id } }))?.schoolId;
        break;
      case "PRINCIPAL":
        userSchoolId = (await prisma.principal.findUnique({ where: { userId: user.id } }))?.schoolId;
        break;
      case "DRIVER":
      case "CONDUCTOR":
        userSchoolId = (await prisma.transportStaff.findUnique({ where: { userId: user.id } }))?.schoolId;
        break;
    }

    if (!userSchoolId) {
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
