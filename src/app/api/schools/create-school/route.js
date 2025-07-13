import { PrismaClient, Role } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supbase-admin"

const prisma = new PrismaClient()

const schoolSchema = z.object({
  name: z.string(),
  location: z.string(),
  email: z.string(),
  phone: z.string(),
  logo: z.string().optional(),
  subscriptionType: z.enum(["A", "B", "C"]),
  language: z.string(),
  domainMode: z.enum(["tenant", "custom"]),
  tenantName: z.string().optional(),
  customDomain: z.string().optional(),
  adminem: z.string().email(),
  adminPassword: z.string().min(6),
})

export async function POST(req) {
  try {
    const body = await req.json()
    const parsed = schoolSchema.parse(body)

    const resolvedDomain =
      parsed.domainMode === "tenant"
        ? `${parsed.tenantName?.toLowerCase().replace(/\s+/g, "")}.edubreezy.com`
        : parsed.customDomain

    // 🔐 1. Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: parsed.adminem,
      password: parsed.adminPassword,
      email_confirm: true,
    })

    if (authError || !authUser?.user?.id) {
      throw new Error(`Supabase Auth Error: ${authError?.message || "Unknown error"}`)
    }

    const uid = authUser.user.id

    // 🔄 2. Store School, User, and Admin in Prisma
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: parsed.name,
          email: parsed.email,
          phone: parsed.phone,
          address: parsed.location,
          logoUrl: parsed.logo || null,
          subscriptionType: parsed.subscriptionType,
          language: parsed.language,
          currentDomain: resolvedDomain,
          customDomain: parsed.domainMode === "custom" ? parsed.customDomain : "",
        },
      })

      await tx.user.create({
        data: {
          id: uid, // Supabase UID
          email: parsed.adminem,
          password: "supabase_managed", // Not used, just placeholder
          role: Role.ADMIN,
        },
      })

      await tx.admin.create({
        data: {
          userId: uid,
          schoolId: school.id,
        },
      })

      return { school }
    })

    return NextResponse.json({ success: true, school: result.school })
  } catch (error) {
    console.error("❌ School creation error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Something went wrong" },
      { status: 500 }
    )
  }
}
