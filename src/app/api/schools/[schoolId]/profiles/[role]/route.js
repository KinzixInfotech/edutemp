import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supbase-admin";
import { z } from "zod";

const roleMap = {
    students: "STUDENT",
    teacher: "TEACHING_STAFF",
    parents: "PARENT",
    staff: "NON_TEACHING_STAFF",
    labassistants: "NON_TEACHING_STAFF",
    librarians: "NON_TEACHING_STAFF",
    accountants: "NON_TEACHING_STAFF",
    busdrivers: "NON_TEACHING_STAFF",
};

const baseUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.string().toUpperCase(), // dynamic string
});

const studentSchema = baseUserSchema.extend({
    studentName: z.string(),
    admissionNo: z.string(),
    academicYearId: z.string(),
    schoolId: z.string().uuid(),
    dob: z.coerce.date(),
    profilePicture: z.string(),
    gender: z.string().toUpperCase(),
    address: z.string(),
    fatherName: z.string().optional(),
    motherName: z.string().optional(),
    fatherMobileNumber: z.string().optional(),
    motherMobileNumber: z.string().optional(),
    guardianType: z.enum(["PARENTS", "GUARDIAN"]),
    guardianName: z.string().optional(),
    guardianRelation: z.string().optional(),
    guardianMobileNo: z.string().optional(),
    studentpfp: z.string().optional(),
    bloodGroup: z.string().optional(),
    adhaarNo: z.string().optional(),
    contactNumber: z.string().optional(),
    classId: z.coerce.number(),
    sectionId: z.string().or(z.number().transform(Number)),
    rollNumber: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    dateOfLeaving: z.coerce.date().optional().nullable(),
    parentId: z.string().uuid().optional().nullable(),
    house: z.string().optional(),
    previousSchoolName: z.string().optional(),
    admissionDate: z.coerce.date().optional(),
});

const teacherSchema = baseUserSchema.extend({
    name: z.string(),
    departmentId: z.string().optional(),

    profilePicture: z.string(),
    designation: z.string(),
    empployeeId: z.string(),
    gender: z.string(),
    age: z.string(),
    bloodGroup: z.string(),
    address: z.string(),
    dob: z.coerce.date(),
    city: z.string(),
    district: z.string(),
    state: z.string(),
    country: z.string(),
    postalCode: z.string(),
    contactNumber: z.string(),
    schoolId: z.string().uuid(),
    department: z.string().optional(),
    designation: z.string(),
});

const staffSchema = baseUserSchema.extend({
    name: z.string(),
    departmentId: z.string().optional(),

    profilePicture: z.string(),
    designation: z.string(),
    empployeeId: z.string(),
    gender: z.string(),
    age: z.string(),
    bloodGroup: z.string(),
    address: z.string(),
    dob: z.coerce.date(),
    city: z.string(),
    district: z.string(),
    state: z.string(),
    country: z.string(),
    postalCode: z.string(),
    contactNumber: z.string(),
    schoolId: z.string().uuid(),
    department: z.string().optional(),
    designation: z.string(),
});

const parentSchema = baseUserSchema.extend({
    guardianName: z.string(),
    childId: z.string().uuid(),
});

export async function POST(req, context) {
    let createdUserId = null;

    try {
        const rawRole = context.params.role;
        const schoolId = context.params.schoolId;
        const mappedRole = roleMap[rawRole?.toLowerCase()];
        const validRoles = ["STUDENT", "TEACHING_STAFF", "PARENT", "NON_TEACHING_STAFF"];

        if (!mappedRole || !validRoles.includes(mappedRole)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        const body = await req.json();
        console.log(body, 'from edu');

        let parsed;

        switch (mappedRole) {
            case "STUDENT":
                parsed = studentSchema.parse({ ...body, role: mappedRole, schoolId });
                break;
            case "TEACHING_STAFF":
                parsed = teacherSchema.parse({ ...body, role: mappedRole, schoolId });
                break;
            case "NON_TEACHING_STAFF":
                parsed = staffSchema.parse({ ...body, role: mappedRole, schoolId });
                break;
            case "PARENT":
                parsed = parentSchema.parse({ ...body, role: mappedRole });
                break;
            default:
                return NextResponse.json({ error: "Unsupported role" }, { status: 400 });
        }

        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: parsed.email,
            password: parsed.password,
            email_confirm: true,
        });

        if (authError || !authUser?.user?.id) {
            throw new Error(`Supabase Auth Error: ${authError?.message || "Unknown error"}`);
        }

        createdUserId = authUser.user.id;

        const created = await prisma.$transaction(async (tx) => {
            // Ensure Role exists
            const role = await tx.role.upsert({
                where: { name: mappedRole },
                update: {},
                create: { name: mappedRole },
            });

            // Create user with role connection
            const user = await tx.user.create({
                data: {
                    id: createdUserId,
                    password: parsed.password,
                    profilePicture: parsed.profilePicture,
                    name: parsed.name,
                    email: parsed.email,
                    school: { connect: { id: parsed.schoolId } },
                    role: { connect: { id: role.id } },
                },
                include: {
                    role: true,
                    school: true,
                },
            });

            let profile = null;

            switch (mappedRole) {
                case "STUDENT":
                    profile = await tx.student.create({
                        data: {
                            name: parsed.studentName,
                            admissionNo: parsed.admissionNo,
                            AcademicYear: { connect: { id: parsed.academicYearId } },
                            school: { connect: { id: parsed.schoolId } },
                            user: { connect: { id: user.id } }, //  REQUIRED!
                            class: { connect: { id: parsed.classId } },
                            dob: parsed.dob.toISOString(),
                            gender: parsed.gender,
                            PreviousSchoolName: parsed.previousSchoolName,
                            Address: parsed.address,
                            FatherName: parsed.fatherName,
                            MotherName: parsed.motherName,
                            FatherNumber: parsed.fatherMobileNumber || "",
                            MotherNumber: parsed.motherMobileNumber || "",
                            bloodGroup: parsed.bloodGroup || "",
                            contactNumber: parsed.contactNumber || "",
                            email: parsed.email,
                            FeeStatus: "PENDING",
                            admissionDate: parsed.admissionDate?.toISOString() || new Date().toISOString(),
                            rollNumber: parsed.rollNumber || "",
                            city: parsed.city || "",
                            state: parsed.state || "",
                            country: parsed.country || "",
                            postalCode: parsed.postalCode || "",
                            DateOfLeaving: parsed.dateOfLeaving || "",
                            parentId: parsed.parentId || null,
                            GuardianName: parsed.guardianName || "",
                            GuardianRelation: parsed.guardianRelation || "",
                            House: parsed.house || "",
                            section: { connect: { id: Number(parsed.sectionId) } },
                        },
                    });
                    break;

                case "TEACHING_STAFF":
                    profile = await tx.teachingStaff.create({
                        data: {
                            // userId: user.id,
                            school: { connect: { id: parsed.schoolId } },
                            user: { connect: { id: user.id } }, //  REQUIRED!
                            // department: parsed.department,
                            designation: parsed.designation,
                            gender: parsed.gender,
                            employeeId: parsed.empployeeId,
                            name: parsed.name,
                            age: parsed.age,
                            bloodGroup: parsed.bloodGroup,
                            dob: parsed.dob.toISOString(),
                            contactNumber: parsed.contactNumber,
                            email: parsed.email,
                            address: parsed.address,
                            City: parsed.city,
                            district: parsed.district || "",
                            state: parsed.state || "",
                            country: parsed.country || "",
                            PostalCode: parsed.postalCode || "",
                        },
                    });
                    break;

                case "NON_TEACHING_STAFF":
                    profile = await tx.NonTeachingStaff.create({
                        data: {
                            // userId: user.id,
                            school: { connect: { id: parsed.schoolId } },
                            user: { connect: { id: user.id } }, //  REQUIRED!
                            // department: parsed.department,
                            designation: parsed.designation,
                            gender: parsed.gender,
                            employeeId: parsed.empployeeId,
                            name: parsed.name,
                            age: parsed.age,
                            bloodGroup: parsed.bloodGroup,
                            dob: parsed.dob.toISOString(),
                            contactNumber: parsed.contactNumber,
                            email: parsed.email,
                            address: parsed.address,
                            City: parsed.city,
                            district: parsed.district || "",
                            state: parsed.state || "",
                            country: parsed.country || "",
                            PostalCode: parsed.postalCode || "",
                        },
                    });
                    break;

                case "PARENT":
                    profile = await tx.parent.create({
                        data: {
                            userId: user.id,
                            guardianName: parsed.guardianName,
                            students: {
                                connect: { userId: parsed.childId },
                            },
                        },
                    });
                    break;
            }

            return { user, profile };
        }, {
            timeout: 10000 // 10 seconds (default is 5000)
        });;

        return NextResponse.json({ success: true, ...created });
    } catch (error) {
        console.error("❌ User profile creation error:", error);

        if (createdUserId) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(createdUserId);
                console.log(`🧹 Deleted Supabase user: ${createdUserId}`);
            } catch (cleanupError) {
                console.error("⚠️ Supabase cleanup failed:", cleanupError);
            }
        }

        return NextResponse.json(
            { error: error.message || "Failed to create profile" },
            { status: 500 }
        );
    }
}
