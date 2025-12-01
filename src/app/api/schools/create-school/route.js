import { AuditAction } from "@prisma/client";
import { supabaseAdmin } from "@/lib/supbase-admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

// Schema validation
const schoolSchema = z.object({
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
  masteradminemail: z.string().email(),
  masteradminpassword: z.string().min(6),
  adminPassword: z.string().min(6),
  generateWebsite: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.domainMode === "tenant" && !data.tenantName) {
    ctx.addIssue({
      path: ["tenantName"],
      code: "custom",
      message: "Tenant name is required when using tenant mode",
    });
  }
  if (data.domainMode === "custom" && (!data.customDomain || data.customDomain.trim() === "")) {
    ctx.addIssue({
      path: ["customDomain"],
      code: "custom",
      message: "Custom domain is required when using custom mode",
    });
  }
});

export async function POST(req) {
  let createdAdminId = null;
  let createdMasterId = null;

  try {
    const body = await req.json();
    const parsed = schoolSchema.parse(body);

    const resolvedDomain = parsed.domainMode === "tenant"
      ? `${parsed.tenantName?.toLowerCase().replace(/\s+/g, "")}.edubreezy.com`
      : parsed.customDomain || "";

    // Step 1: Create Supabase Auth users
    // --- Create Admin User ---
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: parsed.adminem,
      password: parsed.adminPassword,
      email_confirm: true,
    });

    if (adminError || !adminData?.user?.id) {
      throw new Error(`Admin Supabase error: ${adminError?.message || "Missing user ID"}`);
    }
    const createdAdminId = adminData.user.id;

    // --- Create MasterAdmin User ---
    const { data: masterData, error: masterError } = await supabaseAdmin.auth.admin.createUser({
      email: parsed.masteradminemail,
      password: parsed.masteradminpassword,
      email_confirm: true,
    });

    if (masterError || !masterData?.user?.id) {
      // Optional: clean up admin user if master fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdAdminId);
      } catch (cleanupErr) {
        console.error("Failed to rollback admin user:", cleanupErr);
      }

      throw new Error(`MasterAdmin Supabase error: ${masterError?.message || "Missing user ID"}`);
    }
    createdMasterId = masterData.user.id;


    // Step 2: Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: parsed.name,
          domain: resolvedDomain,
          schoolCode: parsed.schoolCode,
          contactNumber: parsed.phone,
          profilePicture: parsed.profilePicture || "",
          location: parsed.location,
          SubscriptionType: parsed.subscriptionType,
          SubscriptionType: parsed.subscriptionType,
          Language: parsed.language,
          websiteConfig: parsed.generateWebsite ? {
            hero: {
              title: `Welcome to ${parsed.name}`,
              subtitle: "Empowering Minds, Shaping Futures",
              image: parsed.profilePicture || "/default-hero.jpg",
              ctaText: "Admissions Open",
              ctaLink: "#admissions"
            },
            about: {
              title: "About Us",
              content: `${parsed.name} is dedicated to providing quality education...`
            },
            principal: {
              name: "Principal Name",
              message: "Welcome to our school...",
              image: "/default-principal.jpg"
            },
            notices: [],
            gallery: [],
            facilities: [
              { title: "Library", icon: "book" },
              { title: "Science Lab", icon: "flask" },
              { title: "Sports", icon: "trophy" }
            ],
            admissions: {
              title: "Admissions",
              content: "Admissions are open for the academic year...",
              link: "/admissions"
            },
            contact: {
              address: parsed.location,
              phone: parsed.phone,
              email: parsed.email
            },
            theme: {
              primaryColor: "#000000",
              secondaryColor: "#ffffff"
            },
            menus: [
              { label: "Home", link: "#hero" },
              { label: "About", link: "#about" },
              { label: "Admissions", link: "#admissions" },
              { label: "Contact", link: "#contact" }
            ]
          } : undefined,
        },
      });

      // Upsert roles
      const [adminRole, masterRole] = await Promise.all([
        tx.role.upsert({
          where: { name: "ADMIN" },
          update: {},
          create: { name: "ADMIN" },
        }),
        tx.role.upsert({
          where: { name: "MASTER_ADMIN" },
          update: {},
          create: { name: "MASTER_ADMIN" },
        }),
      ]);

      // Create Admin user
      const adminUser = await tx.user.create({
        data: {
          id: createdAdminId,
          email: parsed.adminem,
          password: parsed.adminPassword,
          school: { connect: { id: school.id } },
          role: { connect: { id: adminRole.id } },
          Admin: {
            create: { schoolId: school.id },
          },
        },
      });

      // Create MasterAdmin user
      const masterAdminUser = await tx.user.create({
        data: {
          id: createdMasterId,
          email: parsed.masteradminemail,
          password: parsed.masteradminpassword,
          // roleId: masterRole.id,
          // schoolId: school.id,
          school: { connect: { id: school.id } },
          role: { connect: { id: masterRole.id } },
          MasterAdmin: {
            create: {
              school: {
                connect: { id: school.id }, // Link to existing school
              },
            },
          },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: adminUser.id,
          action: AuditAction.CREATE,
          tableName: "School",
          rowId: school.id,
          newData: {
            name: parsed.name,
            domain: resolvedDomain,
            adminEmail: parsed.adminem,
            masterAdminEmail: parsed.masteradminemail,
          },
        },
      });

      return { school, adminUser, masterAdminUser };
    });

    return NextResponse.json({ success: true, result });

  } catch (error) {
    console.error("❌ Error creating school:", error);

    // Cleanup Supabase user if creation partially failed
    if (createdAdminId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdAdminId);
        console.log(`🔁 Rolled back Supabase user: ${createdAdminId}`);
      } catch (cleanupError) {
        console.error("⚠️ Failed to delete Supabase user:", cleanupError);
      }
      if (createdMasterId) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(createdMasterId);
          console.log(`🔁 Rolled back Supabase user: ${createdMasterId}`);
        } catch (cleanupError) {
          console.error("⚠️ Failed to delete Supabase user:", cleanupError);
        }
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