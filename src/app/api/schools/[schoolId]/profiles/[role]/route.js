import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supbase-admin";
import { verifyAdminAccess } from "@/lib/api-auth";
import { z } from "zod";
import { differenceInYears } from "date-fns";

const roleMap = {
    students: "STUDENT",
    teacher: "TEACHING_STAFF",
    parents: "PARENT",
    "non-teaching": "NON_TEACHING_STAFF",
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
    schoolId: z.string().uuid(),
    dob: z.coerce.date().optional().nullable(),
    profilePicture: z.string().optional().nullable(),
    gender: z.string().toUpperCase(),
    address: z.string().optional().default(""),
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
    linkedParentIds: z.array(z.string().uuid()).optional(),
});

const teacherSchema = baseUserSchema.extend({
    name: z.string(),
    departmentId: z.string().optional(),
    profilePicture: z.string().optional().nullable(),
    designation: z.string().optional().default(""),
    empployeeId: z.string().optional().default(""),
    gender: z.string().optional().default(""),
    age: z.string().optional().default(""),
    bloodGroup: z.string().optional().default(""),
    address: z.string().optional().default(""),
    dob: z.coerce.date().optional().nullable(),
    city: z.string().optional().default(""),
    district: z.string().optional().default(""),
    state: z.string().optional().default(""),
    country: z.string().optional().default(""),
    postalCode: z.string().optional().default(""),
    contactNumber: z.string().optional().default(""),
    schoolId: z.string().uuid(),
    department: z.string().optional(),
});

const staffSchema = baseUserSchema.extend({
    name: z.string(),
    departmentId: z.string().optional(),
    profilePicture: z.string().optional().nullable(),
    designation: z.string().optional().default(""),
    empployeeId: z.string().optional().default(""),
    gender: z.string().optional().default(""),
    age: z.string().optional().default(""),
    bloodGroup: z.string().optional().default(""),
    address: z.string().optional().default(""),
    dob: z.coerce.date().optional().nullable(),
    city: z.string().optional().default(""),
    district: z.string().optional().default(""),
    state: z.string().optional().default(""),
    country: z.string().optional().default(""),
    postalCode: z.string().optional().default(""),
    contactNumber: z.string().optional().default(""),
    schoolId: z.string().uuid(),
    department: z.string().optional(),
});

const parentSchema = baseUserSchema.extend({
    guardianName: z.string(),
    email: z.string().email(),
    contactNumber: z.string().regex(/^\d{10}$/, "Contact number must be 10 digits"),
    alternateNumber: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    occupation: z.string().optional(),
    qualification: z.string().optional(),
    annualIncome: z.string().optional(),
    bloodGroup: z.string().optional(),
    gender: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactNumber: z.string().optional(),
    emergencyContactRelation: z.string().optional(),
    linkedStudentIds: z.array(z.string().uuid()).optional(),
    schoolId: z.string().uuid(),
    profilePicture: z.string().optional().nullable(),
});


export async function POST(req, context) {
    let createdUserId = null;

    try {
        const rawRole = (await context.params).role;
        const schoolId = (await context.params).schoolId;

        // ✅ Session auth + admin role + school access verification
        const auth = await verifyAdminAccess(req, schoolId);
        if (auth.error) return auth.response;

        const mappedRole = roleMap[rawRole?.toLowerCase()];
        const validRoles = ["STUDENT", "TEACHING_STAFF", "PARENT", "NON_TEACHING_STAFF"];

        if (!mappedRole || !validRoles.includes(mappedRole)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        const body = await req.json();

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
                parsed = parentSchema.parse({ ...body, role: mappedRole, schoolId });
                break;
            default:
                return NextResponse.json({ error: "Unsupported role" }, { status: 400 });
        }

        // ✅ Duplicate email check
        const existingUser = await prisma.user.findUnique({
            where: { email: parsed.email },
        });
        if (existingUser) {
            return NextResponse.json(
                { error: "A user with this email already exists" },
                { status: 409 }
            );
        }

        // ✅ Duplicate phone check (role-specific, within same school)
        if (parsed.contactNumber && parsed.contactNumber.length >= 10) {
            let phoneExists = false;
            if (mappedRole === "TEACHING_STAFF") {
                phoneExists = await prisma.teachingStaff.findFirst({
                    where: { schoolId, contactNumber: parsed.contactNumber },
                });
            } else if (mappedRole === "NON_TEACHING_STAFF") {
                phoneExists = await prisma.nonTeachingStaff.findFirst({
                    where: { schoolId, contactNumber: parsed.contactNumber },
                });
            } else if (mappedRole === "PARENT") {
                phoneExists = await prisma.parent.findFirst({
                    where: { schoolId, contactNumber: parsed.contactNumber },
                });
            }
            if (phoneExists) {
                return NextResponse.json(
                    { error: "A profile with this contact number already exists in this school" },
                    { status: 409 }
                );
            }
        }

        // ✅ DOB age validation
        if (parsed.dob) {
            const age = differenceInYears(new Date(), new Date(parsed.dob));
            if (age < 3) {
                return NextResponse.json(
                    { error: "Date of birth results in age less than 3 years" },
                    { status: 400 }
                );
            }
            if (age > 100) {
                return NextResponse.json(
                    { error: "Date of birth results in age greater than 100 years" },
                    { status: 400 }
                );
            }
            if (new Date(parsed.dob) > new Date()) {
                return NextResponse.json(
                    { error: "Date of birth cannot be in the future" },
                    { status: 400 }
                );
            }
        }

        //  Fetch active academic year only for student/staff
        let activeAcademicYear = null;
        if (["STUDENT", "TEACHING_STAFF", "NON_TEACHING_STAFF"].includes(mappedRole)) {
            if (rawRole?.toLowerCase() !== "busdrivers") {
                activeAcademicYear = await prisma.academicYear.findFirst({
                    where: { schoolId, isActive: true },
                });

                if (!activeAcademicYear) {
                    throw new Error("No active academic year found. Please create one before creating users.");
                }
            }
        }

        // Determine the correct name field based on role
        const userName = mappedRole === "STUDENT"
            ? parsed.studentName
            : mappedRole === "PARENT"
                ? parsed.guardianName
                : parsed.name;

        // Supabase user creation
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            user_metadata: { name: userName },
            email: parsed.email,
            password: parsed.password,
            email_confirm: true,
        });

        if (authError || !authUser?.user?.id) {
            throw new Error(`Supabase Auth Error: ${authError?.message || "Unknown error"}`);
        }

        createdUserId = authUser.user.id;

        const created = await prisma.$transaction(
            async (tx) => {
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
                        profilePicture: parsed.profilePicture || null,
                        name: userName,
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
                                AcademicYear: { connect: { id: activeAcademicYear.id } },
                                school: { connect: { id: parsed.schoolId } },
                                user: { connect: { id: user.id } },
                                class: { connect: { id: parsed.classId } },
                                dob: parsed.dob ? parsed.dob.toISOString() : "",
                                gender: parsed.gender,
                                PreviousSchoolName: parsed.previousSchoolName,
                                Address: parsed.address || "",
                                FatherName: parsed.fatherName,
                                MotherName: parsed.motherName,
                                FatherNumber: parsed.fatherMobileNumber || "",
                                MotherNumber: parsed.motherMobileNumber || "",
                                bloodGroup: parsed.bloodGroup || "",
                                contactNumber: parsed.contactNumber || "",
                                email: parsed.email,
                                admissionDate:
                                    parsed.admissionDate?.toISOString() || new Date().toISOString(),
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
                                ...(parsed.linkedParentIds && parsed.linkedParentIds.length
                                    ? {
                                        studentParentLinks: {
                                            create: parsed.linkedParentIds.map(parentId => ({
                                                parent: { connect: { id: parentId } },
                                                relation: "GUARDIAN",
                                                isPrimary: false
                                            })),
                                        },
                                    }
                                    : {}),
                            },
                        });
                        break;

                    case "TEACHING_STAFF":
                        profile = await tx.teachingStaff.create({
                            data: {
                                school: { connect: { id: parsed.schoolId } },
                                user: { connect: { id: user.id } },
                                designation: parsed.designation || "",
                                gender: parsed.gender || "",
                                employeeId: parsed.empployeeId || "",
                                name: parsed.name,
                                age: parsed.age || "",
                                bloodGroup: parsed.bloodGroup || "",
                                dob: parsed.dob ? parsed.dob.toISOString() : "",
                                contactNumber: parsed.contactNumber || "",
                                email: parsed.email,
                                address: parsed.address || "",
                                City: parsed.city || "",
                                district: parsed.district || "",
                                state: parsed.state || "",
                                country: parsed.country || "",
                                PostalCode: parsed.postalCode || "",
                                AcademicYear: { connect: { id: activeAcademicYear.id } },
                            },
                        });

                        // Auto-create payroll profile for teaching staff
                        await tx.employeePayrollProfile.create({
                            data: {
                                schoolId: parsed.schoolId,
                                userId: user.id,
                                employeeType: 'TEACHING',
                                employmentType: 'PERMANENT',
                                joiningDate: new Date(),
                                isActive: true
                            }
                        });
                        break;

                    case "NON_TEACHING_STAFF":
                        if (rawRole?.toLowerCase() === "busdrivers") {
                            profile = await tx.NonTeachingStaff.create({
                                data: {
                                    school: { connect: { id: parsed.schoolId } },
                                    user: { connect: { id: user.id } },
                                    designation: parsed.designation || "",
                                    gender: parsed.gender || "",
                                    employeeId: parsed.empployeeId || "",
                                    name: parsed.name,
                                    age: parsed.age || "",
                                    bloodGroup: parsed.bloodGroup || "",
                                    dob: parsed.dob ? parsed.dob.toISOString() : "",
                                    contactNumber: parsed.contactNumber || "",
                                    email: parsed.email,
                                    address: parsed.address || "",
                                    City: parsed.city || "",
                                    district: parsed.district || "",
                                    state: parsed.state || "",
                                    country: parsed.country || "",
                                    PostalCode: parsed.postalCode || "",
                                },
                            });
                        } else {
                            profile = await tx.NonTeachingStaff.create({
                                data: {
                                    school: { connect: { id: parsed.schoolId } },
                                    user: { connect: { id: user.id } },
                                    designation: parsed.designation || "",
                                    gender: parsed.gender || "",
                                    employeeId: parsed.empployeeId || "",
                                    name: parsed.name,
                                    age: parsed.age || "",
                                    bloodGroup: parsed.bloodGroup || "",
                                    dob: parsed.dob ? parsed.dob.toISOString() : "",
                                    contactNumber: parsed.contactNumber || "",
                                    email: parsed.email,
                                    address: parsed.address || "",
                                    City: parsed.city || "",
                                    district: parsed.district || "",
                                    state: parsed.state || "",
                                    country: parsed.country || "",
                                    PostalCode: parsed.postalCode || "",
                                    AcademicYear: { connect: { id: activeAcademicYear.id } },
                                },
                            });
                        }

                        // Auto-create payroll profile for non-teaching staff
                        await tx.employeePayrollProfile.create({
                            data: {
                                schoolId: parsed.schoolId,
                                userId: user.id,
                                employeeType: 'NON_TEACHING',
                                employmentType: 'PERMANENT',
                                joiningDate: new Date(),
                                isActive: true
                            }
                        });
                        break;

                    case "PARENT":
                        profile = await tx.parent.create({
                            data: {
                                userId: user.id,
                                schoolId,
                                name: parsed.guardianName,
                                email: parsed.email,
                                contactNumber: parsed.contactNumber,
                                alternateNumber: parsed.alternateNumber || null,
                                address: parsed.address || null,
                                city: parsed.city || null,
                                state: parsed.state || null,
                                country: parsed.country || null,
                                postalCode: parsed.postalCode || null,
                                occupation: parsed.occupation || null,
                                qualification: parsed.qualification || null,
                                annualIncome: parsed.annualIncome || null,
                                bloodGroup: parsed.bloodGroup || null,
                                emergencyContactName: parsed.emergencyContactName || null,
                                emergencyContactNumber: parsed.emergencyContactNumber || null,
                                emergencyContactRelation: parsed.emergencyContactRelation || null,
                                ...(parsed.linkedStudentIds && parsed.linkedStudentIds.length
                                    ? {
                                        studentLinks: {
                                            create: parsed.linkedStudentIds.map(id => ({
                                                student: { connect: { userId: id } }
                                            })),
                                        },
                                    }
                                    : {}),

                            },
                        });
                        break;
                }

                return { user, profile };
            },
            {
                timeout: 10000, // 10 seconds
            }
        );

        // Track profile picture upload in prisma.upload table
        if (parsed.profilePicture && parsed.profilePicture.includes('r2.edubreezy.com')) {
            try {
                await prisma.upload.create({
                    data: {
                        schoolId,
                        fileUrl: parsed.profilePicture,
                        fileName: `Profile Picture - ${userName}`,
                        mimeType: "image/jpeg",
                        size: 0,
                    },
                });
            } catch (err) {
                console.error("Failed to track profile picture upload:", err);
            }
        }

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
