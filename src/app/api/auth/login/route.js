import { PrismaClient } from "@prisma/client"
import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function POST(req) {
  try {
    const { email, password } = await req.json()
    console.log(email, password)

    // 1. Sign in via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    console.log(authData);
    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: authError?.message || "Invalid credentials" },
        { status: 401 }
      )
    }

    const userId = authData.user.id

    // 2. Get user from your Prisma DB
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      )
    }

    // 3. Get schoolId based on role
    let schoolId = null

    switch (user.role) {
      case "ADMIN": {
        const admin = await prisma.admin.findUnique({ where: { userId } })
        schoolId = admin?.schoolId
        break
      }
      case "TEACHING_STAFF": {
        const teacher = await prisma.teacher.findUnique({ where: { userId } })
        schoolId = teacher?.schoolId
        break
      }
      case "NON_TEACHING_STAFF": {
        const staff = await prisma.staff.findUnique({ where: { userId } })
        schoolId = staff?.schoolId
        break
      }
      case "STUDENT": {
        const student = await prisma.student.findFirst({ where: { userId } })
        schoolId = student?.schoolId
        break
      }
      case "PARENT": {
        // Implement logic to fetch linked student → schoolId
        break
      }
    }

    if (!schoolId) {
      return NextResponse.json(
        { error: "No school linked to this user" },
        { status: 400 }
      )
    }

    // ✅ Return plain user object (NO JWT)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        schoolId,
      },
    })
  } catch (err) {
    console.error("❌ Login Error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
