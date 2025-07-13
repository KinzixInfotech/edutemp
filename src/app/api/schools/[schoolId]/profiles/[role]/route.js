import { PrismaClient, Role, Gender } from "@prisma/client"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supbase-admin"
import { z } from "zod"

const prisma = new PrismaClient()
const roleMap = {
    students: "STUDENT",
    teachers: "TEACHING_STAFF",
    parents: "PARENT",
    peons: "NON_TEACHING_STAFF",
    labassistants: "NON_TEACHING_STAFF",
    librarians: "NON_TEACHING_STAFF",
    accountants: "NON_TEACHING_STAFF",
    busdrivers: "NON_TEACHING_STAFF"
}
// 🔒 Base fields for all users
const baseUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.nativeEnum(Role),
})

// 🎓 STUDENT Schema
const studentSchema = baseUserSchema.extend({
    studentName: z.string(),
    admissionNo: z.string(),
    session: z.string(),
    schoolId: z.string(),
    dob: z.coerce.date(),
    gender: z.nativeEnum(Gender),
    address: z.string(),
    fatherName: z.string(),
    motherName: z.string(),
    studentpfp: z.string().optional(),
    bloodGroup: z.string().optional(),
    adhaarNo: z.string().optional(),
    classId: z.string(),
})

// 🧑‍🏫 TEACHING STAFF Schema
const teacherSchema = baseUserSchema.extend({
    schoolId: z.string(),
    department: z.string(),
    designation: z.string(),
    gender: z.nativeEnum(Gender),
})

// 🧑‍💼 NON-TEACHING STAFF Schema
const staffSchema = baseUserSchema.extend({
    name: z.string(),
    schoolId: z.string(),
    designation: z.string(),
    department: z.string(),
    gender: z.nativeEnum(Gender),
    contact: z.string(),
    address: z.string(),
})

// 👪 PARENT Schema
const parentSchema = baseUserSchema.extend({
    guardianName: z.string(),
    childId: z.string(),
})

export async function POST(req, context) {
    try {
        const rawRole = context.params.role
        const schoolId = context.params.schoolId
        const mappedRole = roleMap[rawRole?.toLowerCase()]
        if (!mappedRole || !Object.values(Role).includes(mappedRole)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 })
        }
        const body = await req.json()
        console.log(body)
        let parsed

        // ✅ Parse according to role
        switch (mappedRole) {
            case "STUDENT":
                parsed = studentSchema.parse({ ...body, role: mappedRole })
                break
            case "TEACHING_STAFF":
                parsed = teacherSchema.parse({ ...body, role: mappedRole })
                break
            case "NON_TEACHING_STAFF":
                parsed = staffSchema.parse({ ...body, role: mappedRole })
                break
            case "PARENT":
                parsed = parentSchema.parse({ ...body, role: mappedRole })
                break
            default:
                return NextResponse.json({ error: "Unsupported role" }, { status: 400 })
        }

        // 🔐 1. Create Supabase Auth User
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: parsed.email,
            password: parsed.password,
            email_confirm: true,
        })

        if (authError || !authUser?.user?.id) {
            throw new Error(`Supabase Auth Error: ${authError?.message || "Unknown error"}`)
        }

        const uid = authUser.user.id

        // 🧠 2. Create in Prisma
        const created = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    id: uid,
                    email: parsed.email,
                    password: "supabase_managed",
                    role: parsed.role,
                },
            })

            let profile = null

            switch (mappedRole) {
                case "STUDENT":
                    profile = await tx.student.create({
                        data: {
                            userId: uid,
                            studentName: parsed.studentName,
                            admissionNo: parsed.admissionNo,
                            session: parsed.session,
                            schoolId: parsed.schoolId,
                            classId: parsed.classId,
                            dob: parsed.dob,
                            gender: parsed.gender,
                            address: parsed.address,
                            fatherName: parsed.fatherName,
                            motherName: parsed.motherName,
                            studentpfp: parsed.studentpfp || null,
                            bloodGroup: parsed.bloodGroup || null,
                            adhaarNo: parsed.adhaarNo || null,
                        },
                    })
                    break

                case "TEACHING_STAFF":
                    profile = await tx.teacher.create({
                        data: {
                            userId: uid,
                            schoolId: parsed.schoolId,
                            department: parsed.department,
                            designation: parsed.designation,
                            gender: parsed.gender,
                            employeeId: `${parsed.schoolId}-${Date.now()}`,
                        },
                    })
                    break

                case "NON_TEACHING_STAFF":
                    profile = await tx.staff.create({
                        data: {
                            userId: uid,
                            name: parsed.name,
                            schoolId: parsed.schoolId,
                            designation: parsed.designation,
                            department: parsed.department,
                            gender: parsed.gender,
                            contact: parsed.contact,
                            address: parsed.address,
                        },
                    })
                    break

                case "PARENT":
                    profile = await tx.parent.create({
                        data: {
                            userId: uid,
                            students: {
                                connect: { id: parsed.childId },
                            },
                        },
                    })
                    break
            }

            return { user, profile }
        })

        return NextResponse.json({ success: true, user: created.user, profile: created.profile })
    } catch (error) {
        console.error("❌ User profile creation error:", error)
        return NextResponse.json({ error: error.message || "Failed to create profile" }, { status: 500 })
    }
}
