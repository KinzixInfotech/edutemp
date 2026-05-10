import { withSchoolAccess } from "@/lib/api-auth";
import { AuditAction, SubscriptionAction } from "@/app/generated/prisma/client";
import { supabaseAdmin } from "@/lib/supbase-admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { addYears, addDays } from "date-fns";
import { invalidatePattern, invalidateSchoolMarketplaceCache } from "@/lib/cache";
import { generateSchoolSlug, generateUniqueSlug } from "@/lib/slug-generator";
import { buildTenantDomain, normalizeSchoolDomain } from "@/lib/school-domain";
import { buildBillingSummary, SCHOOL_FEATURE_PLAN } from "@/lib/school-feature-config";
import { mergeSchoolFeatureControlIntoWebsiteConfig } from "@/lib/school-feature-access";
import { sendResendEmail } from "@/lib/resend";
import { buildSchoolWelcomeTemplate } from "@/emails/school-welcome-template";
import { getPublicEmailAssetOrigin } from "@/lib/email-assets";
// Schema validation
const schoolSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  schoolCode: z.string(),
  location: z.string(),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  country: z.string().optional().default('India'),
  profilePicture: z.string().optional(),
  subscriptionType: z.enum(["A", "B", "C"]),
  language: z.string(),
  domainMode: z.enum(["tenant", "custom"]),
  tenantName: z.string().optional(),
  customDomain: z.string().optional().nullable(),

  // Admin (fixed typo: adminem → adminEmail)
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),

  // Director
  directorName: z.string().min(1),
  directorEmail: z.string().email(),
  directorPassword: z.string().min(6),

  // Principal (optional - only validated in superRefine if createPrincipal is true)
  createPrincipal: z.boolean(),
  principalName: z.string().optional().or(z.literal('')),
  principalEmail: z.string().optional().or(z.literal('')),
  principalPassword: z.string().optional().or(z.literal('')),

  generateWebsite: z.boolean().optional(),

  // ERP Plan & Capacity (Super Admin controlled)
  erpPlan: z.enum([SCHOOL_FEATURE_PLAN.BASE, SCHOOL_FEATURE_PLAN.PRO]).default(SCHOOL_FEATURE_PLAN.BASE),
  expectedStudents: z.coerce.number().min(1).default(100),
  unitsPurchased: z.coerce.number().min(1).optional(),
  includedCapacity: z.coerce.number().optional(),
  softCapacity: z.coerce.number().optional(),
  yearlyAmount: z.coerce.number().optional(),
  billingStartDate: z.coerce.date().optional(),
  billingEndDate: z.coerce.date().optional(),
  isTrial: z.boolean().optional().default(false),
  trialDays: z.coerce.number().optional()
}).superRefine((data, ctx) => {
  if (data.domainMode === "tenant" && !data.tenantName) {
    ctx.addIssue({
      path: ["tenantName"],
      code: "custom",
      message: "Tenant name is required when using tenant mode"
    });
  }
  if (data.domainMode === "custom" && (!data.customDomain || data.customDomain.trim() === "")) {
    ctx.addIssue({
      path: ["customDomain"],
      code: "custom",
      message: "Custom domain is required when using custom mode"
    });
  }
  // Validate Principal fields if createPrincipal is true
  if (data.createPrincipal) {
    if (!data.principalName || data.principalName.trim() === '') {
      ctx.addIssue({
        path: ['principalName'],
        code: 'custom',
        message: 'Principal name is required'
      });
    }
    if (!data.principalEmail || data.principalEmail.trim() === '') {
      ctx.addIssue({
        path: ['principalEmail'],
        code: 'custom',
        message: 'Principal email is required'
      });
    }
    if (!data.principalPassword || data.principalPassword.length < 6) {
      ctx.addIssue({
        path: ['principalPassword'],
        code: 'custom',
        message: 'Principal password must be at least 6 characters'
      });
    }
  }
});

// Capacity constants
const PRICE_PER_UNIT = 12000; // ₹12,000 per 100 students / year
const STUDENTS_PER_UNIT = 100;
const SOFT_BUFFER_PERCENT = 5;
const WELCOME_EMAIL_FROM = 'EduBreezy <hello@edubreezy.com>';
const WELCOME_EMAIL_COPY_RECIPIENTS = [
  'edubreezyindia@gmail.com',
  'kinzixinfotech@gmail.com',
  'mansajami2020@gmail.com',
];

function formatInrAmount(value) {
  if (value === null || value === undefined || value === '') return null;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function getUniqueWelcomeRecipients({ publicProfile, directorUser, principalUser }) {
  const recipients = [
    {
      email: directorUser?.email,
      name: directorUser?.name,
      role: 'Director',
    },
    principalUser?.email ?
      {
        email: principalUser.email,
        name: principalUser.name,
        role: 'Principal',
      } :
      null,
    {
      email: publicProfile?.publicEmail,
      name: `${directorUser?.name || 'School leadership'} and team`,
      role: 'School Inbox',
    },
  ].filter(Boolean);

  const seen = new Set();
  return recipients.filter((recipient) => {
    const normalizedEmail = String(recipient.email || '').trim().toLowerCase();
    if (!normalizedEmail || seen.has(normalizedEmail)) return false;
    seen.add(normalizedEmail);
    return true;
  });
}

async function sendSchoolWelcomeEmails({ result, resolvedDomain, req, erpPlan }) {
  const origin = req.nextUrl.origin;
  const emailAssetOrigin = getPublicEmailAssetOrigin(origin);
  const loginUrl = `${origin}/login`;
  const schoolUrl = resolvedDomain ? `https://${resolvedDomain}` : origin;
  const { school, directorUser, principalUser, subscription, publicProfile } = result;
  const recipients = getUniqueWelcomeRecipients({ publicProfile, directorUser, principalUser });

  const results = await Promise.allSettled(
    recipients.map((recipient) => {
      const template = buildSchoolWelcomeTemplate({
        recipientName: recipient.name,
        recipientRole: recipient.role,
        schoolName: school.name,
        schoolEmail: publicProfile?.publicEmail,
        schoolLogoUrl: school.profilePicture,
        schoolCode: school.schoolCode,
        schoolPhone: school.contactNumber,
        schoolLocation: school.location,
        schoolCity: school.city,
        schoolState: school.state,
        schoolCountry: school.country,
        directorName: directorUser?.name,
        principalName: principalUser?.name,
        loginUrl,
        schoolUrl,
        plan: erpPlan,
        includedCapacity: subscription?.includedCapacity ? `${subscription.includedCapacity} students` : null,
        yearlyAmount: formatInrAmount(subscription?.yearlyAmount),
        origin: emailAssetOrigin,
      });

      return sendResendEmail({
        to: recipient.email,
        from: WELCOME_EMAIL_FROM,
        replyTo: 'hello@edubreezy.com',
        bcc: WELCOME_EMAIL_COPY_RECIPIENTS,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    })
  );

  return results.map((result, index) => ({
    email: recipients[index].email,
    role: recipients[index].role,
    status: result.status === 'fulfilled' ? 'SENT' : 'FAILED',
    providerId:
      result.status === 'fulfilled' ?
      result.value?.data?.id || result.value?.id || null :
      null,
    error: result.status === 'rejected' ? result.reason?.message || 'Unknown email error' : null,
    copiedTo: WELCOME_EMAIL_COPY_RECIPIENTS,
  }));
}

export const POST = withSchoolAccess(async function POST(req) {
  let createdAdminId = null;
  let createdDirectorId = null;
  let createdPrincipalId = null;

  try {
    const body = await req.json();
    const parsed = schoolSchema.parse(body);

    const resolvedDomain = parsed.domainMode === "tenant" ?
    buildTenantDomain(parsed.tenantName) :
    normalizeSchoolDomain(parsed.customDomain || "");

    // Calculate ERP capacity values
    const erpPlan = parsed.erpPlan || SCHOOL_FEATURE_PLAN.BASE;
    const expectedStudents = parsed.expectedStudents || 100;
    const unitsPurchased = parsed.unitsPurchased || Math.ceil(expectedStudents / STUDENTS_PER_UNIT);
    const includedCapacity = parsed.includedCapacity || unitsPurchased * STUDENTS_PER_UNIT;
    const softCapacity = parsed.softCapacity || Math.floor(includedCapacity * (1 + SOFT_BUFFER_PERCENT / 100));
    const calculatedBilling = buildBillingSummary({
      plan: erpPlan,
      activeStudentCount: expectedStudents,
    });
    const yearlyAmount = parsed.yearlyAmount || calculatedBilling.yearlyAmount;
    const billingStartDate = parsed.billingStartDate || new Date();
    const billingEndDate = parsed.billingEndDate || addYears(billingStartDate, 1);
    const isTrial = parsed.isTrial || false;
    const trialDays = parsed.trialDays || 0;
    const trialEndsAt = isTrial && trialDays > 0 ? addDays(new Date(), trialDays) : null;

    // Step 1: Create Supabase Auth users
    // --- Create Admin User ---
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: parsed.adminEmail,
      password: parsed.adminPassword,
      email_confirm: true
    });

    if (adminError || !adminData?.user?.id) {
      throw new Error(`Admin Supabase error: ${adminError?.message || "Missing user ID"}`);
    }
    createdAdminId = adminData.user.id;

    // --- Create Director User ---
    const { data: directorData, error: directorError } = await supabaseAdmin.auth.admin.createUser({
      email: parsed.directorEmail,
      password: parsed.directorPassword,
      email_confirm: true
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
        email_confirm: true
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


    // Step 2: Prisma transaction with extended timeout
    const result = await prisma.$transaction(async (tx) => {
      const baseWebsiteConfig = parsed.generateWebsite ? {
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
        { title: "Sports", icon: "trophy" }],

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
        { label: "Contact", link: "#contact" }]

      } : undefined;

      const school = await tx.school.create({
        data: {
          name: parsed.name,
          domain: resolvedDomain,
          schoolCode: parsed.schoolCode,
          contactNumber: parsed.phone,
          profilePicture: parsed.profilePicture || "",
          location: parsed.location,
          city: parsed.city || null,
          state: parsed.state || null,
          country: parsed.country || 'India',
          SubscriptionType: parsed.subscriptionType,
          Language: parsed.language,
          websiteConfig: mergeSchoolFeatureControlIntoWebsiteConfig(baseWebsiteConfig, {
            plan: erpPlan,
            overrides: { enabled: [], disabled: [] },
          }),
        }
      });

      // Upsert roles
      const [adminRole, directorRole, principalRole] = await Promise.all([
      tx.role.upsert({
        where: { name: "ADMIN" },
        update: {},
        create: { name: "ADMIN" }
      }),
      tx.role.upsert({
        where: { name: "DIRECTOR" },
        update: {},
        create: { name: "DIRECTOR" }
      }),
      tx.role.upsert({
        where: { name: "PRINCIPAL" },
        update: {},
        create: { name: "PRINCIPAL" }
      })]
      );

      // Create Admin user
      const adminUser = await tx.user.create({
        data: {
          id: createdAdminId,
          name: parsed.adminName,
          email: parsed.adminEmail,
          password: parsed.adminPassword,
          school: { connect: { id: school.id } },
          role: { connect: { id: adminRole.id } },
          Admin: {
            create: { schoolId: school.id }
          }
        }
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
          director: {
            create: { schoolId: school.id }
          }
        }
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
            principal: {
              create: { schoolId: school.id }
            }
          }
        });
      }

      // Create School Subscription (ERP Billing)
      const subscription = await tx.schoolSubscription.create({
        data: {
          schoolId: school.id,
          expectedStudents,
          unitsPurchased,
          includedCapacity,
          softCapacity,
          pricePerUnit: PRICE_PER_UNIT,
          yearlyAmount,
          billingStartDate,
          billingEndDate,
          isTrial,
          trialDays: isTrial ? trialDays : null,
          trialEndsAt,
          status: isTrial ? 'TRIAL' : 'ACTIVE',
          createdBy: createdAdminId // Super Admin who created
        }
      });

      // Create Subscription Audit Logs
      await tx.subscriptionAuditLog.createMany({
        data: [
        {
          subscriptionId: subscription.id,
          action: SubscriptionAction.SUBSCRIPTION_CREATED,
          performedBy: createdAdminId,
          newValue: {
            schoolId: school.id,
            schoolName: parsed.name,
            domain: resolvedDomain
          }
        },
        {
          subscriptionId: subscription.id,
          action: SubscriptionAction.CAPACITY_ASSIGNED,
          performedBy: createdAdminId,
          newValue: {
            expectedStudents,
            unitsPurchased,
            includedCapacity,
            softCapacity,
            yearlyAmount,
            pricePerUnit: PRICE_PER_UNIT
          }
        },
        {
          subscriptionId: subscription.id,
          action: SubscriptionAction.HANDOVER_COMPLETED,
          performedBy: createdAdminId,
          newValue: {
            adminEmail: parsed.adminEmail,
            directorEmail: parsed.directorEmail,
            principalEmail: parsed.createPrincipal ? parsed.principalEmail : null,
            billingStart: billingStartDate,
            billingEnd: billingEndDate,
            isTrial
          }
        }]

      });

      // Audit log for school creation
      await tx.auditLog.create({
        data: {
          userId: adminUser.id,
          action: AuditAction.CREATE,
          tableName: "School",
          rowId: school.id,
          newData: {
            name: parsed.name,
            domain: resolvedDomain,
            adminEmail: parsed.adminEmail,
            directorEmail: parsed.directorEmail,
            principalEmail: parsed.createPrincipal ? parsed.principalEmail : null,
            subscriptionId: subscription.id,
            capacity: {
              expectedStudents,
              unitsPurchased,
              softCapacity,
              yearlyAmount
            }
          }
        }
      });

      // Track logo upload in prisma.upload table (Migrated from UploadThing callback)
      if (parsed.profilePicture && parsed.profilePicture.includes('r2.edubreezy.com')) {
        await tx.upload.create({
          data: {
            schoolId: school.id,
            fileUrl: parsed.profilePicture,
            fileName: `School Logo - ${parsed.name}`,
            mimeType: "image/jpeg",
            size: 0
          }
        });
      }

      const baseSlug = generateSchoolSlug(parsed.name, parsed.location);
      let finalSlug = null;
      if (baseSlug) {
        const existingSlugs = await tx.schoolPublicProfile.findMany({
          where: { slug: { startsWith: baseSlug } },
          select: { slug: true }
        }).then((records) => records.map((record) => record.slug));
        finalSlug = generateUniqueSlug(baseSlug, existingSlugs);
      }

      const publicProfile = await tx.schoolPublicProfile.upsert({
        where: { schoolId: school.id },
        update: {
          slug: finalSlug,
          logoImage: parsed.profilePicture || null,
          publicPhone: parsed.phone || null,
          publicEmail: parsed.email || null,
          website: resolvedDomain ? `https://${resolvedDomain}` : null
        },
        create: {
          schoolId: school.id,
          slug: finalSlug,
          isPubliclyVisible: false,
          listingSource: 'ERP',
          logoImage: parsed.profilePicture || null,
          publicPhone: parsed.phone || null,
          publicEmail: parsed.email || null,
          website: resolvedDomain ? `https://${resolvedDomain}` : null
        },
        select: { id: true, schoolId: true, slug: true, publicEmail: true, publicPhone: true, website: true }
      });

      return { school, adminUser, directorUser, principalUser, subscription, publicProfile };
    }, {
      timeout: 30000, // 30 seconds timeout
      maxWait: 60000 // 60 seconds max wait
    });

    // Invalidate school search cache so new school appears immediately
    await invalidatePattern('schools:search:*');
    await invalidateSchoolMarketplaceCache(result.publicProfile);

    let welcomeEmail = [];
    try {
      welcomeEmail = await sendSchoolWelcomeEmails({ result, resolvedDomain, req, erpPlan });
    } catch (emailError) {
      console.error("⚠️ Failed to send school welcome email:", emailError);
      welcomeEmail = [
        {
          status: 'FAILED',
          error: emailError?.message || 'Unknown email error',
        }
      ];
    }

    return NextResponse.json({ success: true, result, welcomeEmail });

  } catch (error) {
    console.error("❌ Error creating school:", error);

    // Cleanup Supabase users if creation partially failed
    const usersToCleanup = [createdAdminId, createdDirectorId, createdPrincipalId].filter(Boolean);
    for (const userId of usersToCleanup) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        console.log(`🔁 Rolled back Supabase user: ${userId}`);
      } catch (cleanupError) {
        console.error("⚠️ Failed to delete Supabase user:", cleanupError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
        error instanceof Error ?
        error.message :
        typeof error === "string" ?
        error :
        JSON.stringify(error)
      },
      { status: 500 }
    );
  }
});
