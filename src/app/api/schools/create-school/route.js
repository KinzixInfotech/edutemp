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

  // Admin
  adminName: z.string().min(1),
  adminem: z.string().email(),
  adminPassword: z.string().min(6),

  // Director
  directorName: z.string().min(1),
  directorEmail: z.string().email(),
  directorPassword: z.string().min(6),

  //Principal (optional)
  createPrincipal: z.boolean(),
  principalName: z.string().optional(),
  principalEmail: z.string().email().optional().or(z.literal('')),
  principalPassword: z.string().min(6).optional(),

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
  // Validate Principal fields if createPrincipal is true
  if (data.createPrincipal) {
    if (!data.principalName || data.principalName.trim() === '') {
      ctx.addIssue({
        path: ['principalName'],
        code: 'custom',
        message: 'Principal name is required',
      });
    }
    if (!data.principalEmail || data.principalEmail.trim() === '') {
      ctx.addIssue({
        path: ['principalEmail'],
        code: 'custom',
        message: 'Principal email is required',
      });
    }
    if (!data.principalPassword || data.principalPassword.length < 6) {
      ctx.addIssue({
        path: ['principalPassword'],
        code: 'custom',
        message: 'Principal password must be at least 6 characters',
      });
    }
  }
});

export async function POST(req) {
  let createdAdminId = null;
  let createdDirectorId = null;
  let createdPrincipalId = null;

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
    createdAdminId = adminData.user.id;

    // --- Create Director User ---
    const { data: directorData, error: directorError } = await supabaseAdmin.auth.admin.createUser({
      email: parsed.directorEmail,
      password: parsed.directorPassword,
      email_confirm: true,
    });

    if (directorError || !directorData?.user?.id) {
      // Rollback admin user
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdAdminId);
      } catch (cleanupErr) {
        console.error("Failed to rollback admin user:", cleanupErr);
      }
      throw new Error(`Director Supabase error: ${directorError?.message || "Missing user ID"}`);
    }
    createdDirectorId = directorData.user.id;

    // --- Create Principal User (if requested) ---
    if (parsed.createPrincipal) {
      const { data: principalData, error: principalError } = await supabaseAdmin.auth.admin.createUser({
        email: parsed.principalEmail,
        password: parsed.principalPassword,
        email_confirm: true,
      });

      if (principalError || !principalData?.user?.id) {
        // Rollback admin and director
        try {
          await supabaseAdmin.auth.admin.deleteUser(createdAdminId);
          await supabaseAdmin.auth.admin.deleteUser(createdDirectorId);
        } catch (cleanupErr) {
          console.error("Failed to rollback users:", cleanupErr);
        }
        throw new Error(`Principal Supabase error: ${principalError?.message || "Missing user ID"}`);
      }
      createdPrincipalId = principalData.user.id;
    }


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
      const [adminRole, directorRole, principalRole] = await Promise.all([
        tx.role.upsert({
          where: { name: "ADMIN" },
          update: {},
          create: { name: "ADMIN" },
        }),
        tx.role.upsert({
          where: { name: "DIRECTOR" },
          update: {},
          create: { name: "DIRECTOR" },
        }),
        tx.role.upsert({
          where: { name: "PRINCIPAL" },
          update: {},
          create: { name: "PRINCIPAL" },
        }),
      ]);

      // Create Admin user
      const adminUser = await tx.user.create({
        data: {
          id: createdAdminId,
          name: parsed.adminName,
          email: parsed.adminem,
          password: parsed.adminPassword,
          school: { connect: { id: school.id } },
          role: { connect: { id: adminRole.id } },
          Admin: {
            create: { schoolId: school.id },
          },
        },
      });

      // Create Director user
      const directorUser = await tx.user.create({
        data: {
          id: createdDirectorId,
          name: parsed.directorName,
          email: parsed.directorEmail,
          password: parsed.directorPassword,
          school: { connect: { id: school.id } },
          role: { connect: { id: directorRole.id } },
          Director: {
            create: { schoolId: school.id },
          },
        },
      });

      // Create Principal user (if requested)
      let principalUser = null;
      if (parsed.createPrincipal && createdPrincipalId) {
        principalUser = await tx.user.create({
          data: {
            id: createdPrincipalId,
            name: parsed.principalName,
            email: parsed.principalEmail,
            password: parsed.principalPassword,
            school: { connect: { id: school.id } },
            role: { connect: { id: principalRole.id } },
            Principal: {
              create: { schoolId: school.id },
            },
          },
        });
      }

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
            directorEmail: parsed.directorEmail,
            principalEmail: parsed.createPrincipal ? parsed.principalEmail : null,
          },
        },
      });

      return { school, adminUser, directorUser, principalUser };
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