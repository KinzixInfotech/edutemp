import { AuditAction } from "@prisma/client";
import { supabaseAdmin } from "@/lib/supbase-admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const schoolSchema = z
  .object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string(),
    schoolCode: z.string(),
    location: z.string(),
    profilePicture: z.string().optional(),
    subscriptionType: z.enum(["A", "B", "C"]),
    language: z.string(),
    domainMode: z.enum(["tenant", "custom"]),
    tenantName: z.string().optional(),
    customDomain: z.string().optional().nullable(),
    adminem: z.string().email(),
    adminPassword: z.string().min(6),
  })
  .superRefine((data, ctx) => {
    if (data.domainMode === "tenant" && !data.tenantName) {
      ctx.addIssue({
        path: ["tenantName"],
        code: "custom",
        message: "Tenant name is required when using tenant mode",
      });
    }

    if (
      data.domainMode === "custom" &&
      (!data.customDomain || data.customDomain.trim() === "")
    ) {
      ctx.addIssue({
        path: ["customDomain"],
        code: "custom",
        message: "Custom domain is required when using custom mode",
      });
    }
  });

export async function POST(req) {
  let createdUserId = null;

  try {
    const body = await req.json();
    console.log(body)
    const parsed = schoolSchema.parse(body);

    const resolvedDomain =
      parsed.domainMode === "tenant"
        ? `${parsed.tenantName?.toLowerCase().replace(/\s+/g, "")}.edubreezy.com`
        : parsed.customDomain || "";

    // Step 1: Create user in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: parsed.adminem,
      password: parsed.adminPassword,
      email_confirm: true,
    });

    console.log("Supabase response:", data, error);

    if (error || !data?.user?.id) {
      throw new Error(`Supabase Auth Error: ${error?.message}`);
    }

    createdUserId = data.user.id;

    // Step 2: Transaction to create school, user, admin, audit
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.School.create({
        data: {
          name: parsed.name,
          domain: resolvedDomain,
          schoolCode: parsed.schoolCode,
          contactNumber: parsed.phone,
          profilePicture: parsed.profilePicture || "",
          location: parsed.location,
          SubscriptionType: parsed.subscriptionType,
          Language: parsed.language,
        },
      });
      // Ensure ADMIN role exists or create it
      const adminRole = await tx.Role.upsert({
        where: { name: "ADMIN" },
        update: {},
        create: { name: "ADMIN" },
      });

      const user = await tx.User.create({
        data: {
          id: createdUserId, //  use Supabase Auth ID
          password: parsed.adminPassword,
          email: parsed.adminem,
          school: { connect: { id: school.id } },
          role: { connect: { id: adminRole.id } },
          Admin: {
            create: { schoolId: school.id },
          },
        },
      });

      await tx.AuditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.CREATE,
          tableName: "School",
          rowId: school.id, // Must be String (UUID) in Prisma schema
          newData: {
            name: parsed.name,
            domain: resolvedDomain,
            adminEmail: parsed.adminem,
          },
        },
      });

      return { school, user };
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("❌ Error creating school:", error);

    // Cleanup Supabase user if creation partially failed
    if (createdUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdUserId);
        console.log(`🔁 Rolled back Supabase user: ${createdUserId}`);
      } catch (cleanupError) {
        console.error("⚠️ Failed to delete Supabase user:", cleanupError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : JSON.stringify(error),
      },
      { status: 500 }
    );
  }
}
