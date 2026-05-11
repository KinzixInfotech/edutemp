import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { withSchoolAccess } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supbase-admin";
import { sendEmail, getAccountCredentialsEmailTemplate } from "@/lib/email";
import { buildParentAuthEmail, normalizePhoneNumber, normalizeStudentIdentifier } from "@/lib/auth-identifiers";
import { getSchoolIdentityContext } from "@/lib/profile-auth";

const activationSchema = z.object({
  admissionNo: z.string().min(1),
  parentPhone: z.string().optional(),
  parentPassword: z.string().min(6).optional(),
  studentPassword: z.string().min(6).optional(),
  sendEmail: z.boolean().optional().default(false),
});

async function upsertSupabasePassword({ user, password, role }) {
  const payload = {
    id: user.id,
    email: user.email,
    password,
    email_confirm: true,
    user_metadata: {
      name: user.name,
      role,
    },
  };

  const updated = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    email: user.email,
    password,
    email_confirm: true,
    user_metadata: payload.user_metadata,
  });

  if (!updated.error) {
    return updated.data?.user;
  }

  const created = await supabaseAdmin.auth.admin.createUser(payload);
  if (created.error) {
    throw new Error(created.error.message || "Unable to activate Supabase access");
  }

  return created.data?.user;
}

function visibleEmail(email) {
  return email && !/@(parent|student)\.[a-z0-9-]+\.local$/i.test(email) ? email : null;
}

export const POST = withSchoolAccess(async function POST(req, { params }) {
  try {
    const { schoolId } = await params;
    const body = activationSchema.parse(await req.json());
    const admissionNo = normalizeStudentIdentifier(body.admissionNo);

    if (!body.parentPassword && !body.studentPassword) {
      return NextResponse.json({ error: "Provide a parent password, student password, or both." }, { status: 400 });
    }

    if (body.parentPassword && body.studentPassword && body.parentPassword === body.studentPassword) {
      return NextResponse.json({ error: "Parent and student passwords must be different." }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: { schoolId, admissionNo },
      include: {
        user: true,
        school: { select: { name: true } },
        studentParentLinks: {
          where: { isActive: true },
          include: { parent: { include: { user: true } } },
          orderBy: { isPrimary: "desc" },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found for this admission number." }, { status: 404 });
    }

    const credentials = [];

    if (body.studentPassword) {
      await upsertSupabasePassword({ user: student.user, password: body.studentPassword, role: "student" });
      await prisma.user.update({
        where: { id: student.userId },
        data: { password: await bcrypt.hash(body.studentPassword, 10), status: "ACTIVE" },
      });
      credentials.push({
        userType: "student",
        name: student.name,
        loginLabel: "Admission Number",
        loginValue: student.admissionNo,
        password: body.studentPassword,
        email: visibleEmail(student.email),
      });
    }

    if (body.parentPassword) {
      const parent = student.studentParentLinks[0]?.parent;
      if (!parent?.user) {
        return NextResponse.json({ error: "No linked parent profile found for this admission number." }, { status: 404 });
      }

      const normalizedParentPhone = normalizePhoneNumber(body.parentPhone || parent.contactNumber);
      if (!normalizedParentPhone || normalizedParentPhone.length !== 10) {
        return NextResponse.json({ error: "Parent phone number is required before parent app access can be activated." }, { status: 400 });
      }

      const existingPhoneParent = await prisma.parent.findFirst({
        where: {
          schoolId,
          contactNumber: normalizedParentPhone,
          id: { not: parent.id },
        },
      });
      if (existingPhoneParent) {
        return NextResponse.json({ error: "This parent phone number is already used by another parent profile." }, { status: 409 });
      }

      const school = await getSchoolIdentityContext(schoolId);
      const parentAuthEmail = buildParentAuthEmail({ phone: normalizedParentPhone, school });
      const parentUser = { ...parent.user, email: parentAuthEmail };

      await upsertSupabasePassword({ user: parentUser, password: body.parentPassword, role: "parent" });
      await prisma.user.update({
        where: { id: parent.userId },
        data: { email: parentAuthEmail, password: await bcrypt.hash(body.parentPassword, 10), status: "ACTIVE" },
      });
      await prisma.parent.update({
        where: { id: parent.id },
        data: {
          contactNumber: normalizedParentPhone,
          email: visibleEmail(parent.email) || parentAuthEmail,
          alternateNumber: null,
          status: "ACTIVE",
        },
      });
      credentials.push({
        userType: "parent",
        name: parent.name,
        loginLabel: "Phone Number",
        loginValue: normalizedParentPhone,
        password: body.parentPassword,
        email: visibleEmail(parent.email),
      });
    }

    if (body.sendEmail) {
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://edubreezy.com"}/login`;
      await Promise.all(credentials.map(async (credential) => {
        if (!credential.email) return;
        const template = getAccountCredentialsEmailTemplate({
          userName: credential.name,
          email: credential.email,
          password: credential.password,
          userType: credential.userType,
          schoolName: student.school?.name || "Your School",
          loginUrl,
          loginLabel: credential.loginLabel,
          loginValue: credential.loginValue,
        });
        await sendEmail({
          to: credential.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
      }));
    }

    return NextResponse.json({
      success: true,
      admissionNo: student.admissionNo,
      credentials,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid activation data.", fieldErrors: error.flatten().fieldErrors }, { status: 400 });
    }

    console.error("[PROFILE_ACCESS_ACTIVATION]", error);
    return NextResponse.json({ error: error.message || "Failed to activate app access." }, { status: 500 });
  }
});
