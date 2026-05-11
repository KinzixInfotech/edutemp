import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { withSchoolAccess } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supbase-admin";
import { buildParentAuthEmail, normalizePhoneNumber } from "@/lib/auth-identifiers";
import { getSchoolIdentityContext, isMissingContactPlaceholder } from "@/lib/profile-auth";
import { invalidateParentDirectoryCaches } from "@/lib/cache";

const activateSchema = z.object({
  parentId: z.string().uuid(),
  phone: z.string().min(1),
  password: z.string().min(6),
});

async function upsertParentAuthUser({ user, password }) {
  const metadata = { name: user.name, role: "parent" };
  const updated = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    email: user.email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (!updated.error) return updated.data?.user;

  const created = await supabaseAdmin.auth.admin.createUser({
    id: user.id,
    email: user.email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (created.error) {
    throw new Error(created.error.message || "Unable to activate parent app access");
  }

  return created.data?.user;
}

export const GET = withSchoolAccess(async function GET(req, { params }) {
  try {
    const { schoolId } = await params;
    const { searchParams } = new URL(req.url);
    const search = String(searchParams.get("search") || "").trim();

    const parents = await prisma.parent.findMany({
      where: {
        schoolId,
        OR: [
          { contactNumber: { startsWith: "missing:" } },
          { user: { status: "INACTIVE" } },
        ],
        ...(search ? {
          AND: [{
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { contactNumber: { contains: search, mode: "insensitive" } },
              {
                studentLinks: {
                  some: {
                    student: {
                      OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { admissionNo: { contains: search, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              },
            ],
          }],
        } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
        studentLinks: {
          where: { isActive: true },
          include: {
            student: {
              select: {
                userId: true,
                name: true,
                admissionNo: true,
                class: { select: { className: true } },
                section: { select: { name: true } },
              },
            },
          },
          orderBy: { isPrimary: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      parents: parents.map((parent) => ({
        id: parent.id,
        name: parent.name,
        contactNumber: parent.contactNumber,
        phoneMissing: isMissingContactPlaceholder(parent.contactNumber),
        authStatus: isMissingContactPlaceholder(parent.contactNumber)
          ? "pending_phone"
          : parent.user?.status === "ACTIVE"
            ? "active"
            : "inactive",
        userStatus: parent.user?.status,
        children: parent.studentLinks.map((link) => ({
          id: link.student.userId,
          name: link.student.name,
          admissionNo: link.student.admissionNo,
          className: link.student.class?.className || "",
          sectionName: link.student.section?.name || "",
        })),
      })),
    });
  } catch (error) {
    console.error("[PENDING_PARENT_PHONE_GET]", error);
    return NextResponse.json({ error: "Failed to load pending parent phone records." }, { status: 500 });
  }
});

export const POST = withSchoolAccess(async function POST(req, { params }) {
  try {
    const { schoolId } = await params;
    const body = activateSchema.parse(await req.json());
    const phone = normalizePhoneNumber(body.phone);

    if (!phone || phone.length !== 10) {
      return NextResponse.json({ error: "Enter a valid 10-digit parent phone number." }, { status: 400 });
    }

    const parent = await prisma.parent.findFirst({
      where: { id: body.parentId, schoolId },
      include: { user: true },
    });

    if (!parent?.user) {
      return NextResponse.json({ error: "Parent profile not found." }, { status: 404 });
    }

    const existingPhoneParent = await prisma.parent.findFirst({
      where: {
        schoolId,
        contactNumber: phone,
        id: { not: parent.id },
      },
    });

    if (existingPhoneParent) {
      return NextResponse.json({ error: "This phone number is already used by another parent." }, { status: 409 });
    }

    const school = await getSchoolIdentityContext(schoolId);
    const authEmail = buildParentAuthEmail({ phone, school });
    const authUser = {
      id: parent.userId,
      name: parent.name,
      email: authEmail,
    };

    await upsertParentAuthUser({ user: authUser, password: body.password });
    await prisma.$transaction([
      prisma.user.update({
        where: { id: parent.userId },
        data: {
          email: authEmail,
          password: await bcrypt.hash(body.password, 10),
          status: "ACTIVE",
        },
      }),
      prisma.parent.update({
        where: { id: parent.id },
        data: {
          contactNumber: phone,
          email: parent.email && !/@(parent|student)\.[a-z0-9-]+\.local$/i.test(parent.email) ? parent.email : authEmail,
          alternateNumber: null,
          status: "ACTIVE",
        },
      }),
    ]);

    await invalidateParentDirectoryCaches({ schoolId, parentId: parent.id });

    return NextResponse.json({
      success: true,
      parentId: parent.id,
      loginLabel: "Phone Number",
      loginValue: phone,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid activation data.", fieldErrors: error.flatten().fieldErrors }, { status: 400 });
    }

    console.error("[PENDING_PARENT_PHONE_POST]", error);
    return NextResponse.json({ error: error.message || "Failed to activate parent phone login." }, { status: 500 });
  }
});
