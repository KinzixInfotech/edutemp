import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { supabase } from "@/lib/supabase";
import { enforceSchoolStateAccess, resolveSchoolIdForUser } from '@/lib/school-account-state';

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
      if (schoolCode) {
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
    if (!schoolCode) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "School code required for this role." }, { status: 400 });
    }

    // Step 3️⃣: Set user ACTIVE
    await prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
    });

    // Step 4️⃣: Resolve schoolId based on user role
    const userSchoolId = await resolveSchoolIdForUser(user);

    if (!userSchoolId) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "School not linked to user" }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
      where: { id: userSchoolId },
      select: { id: true, schoolCode: true },
    });

    if (!school || school.schoolCode !== schoolCode) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "School code does not match the user's school" }, { status: 403 });
    }

    const schoolAccess = await enforceSchoolStateAccess({
      schoolId: userSchoolId,
      method: req.method,
    });

    if (!schoolAccess.ok) {
      await supabase.auth.signOut();
      return schoolAccess.response;
    }

    // ✅ All good
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        schoolId: userSchoolId,
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
