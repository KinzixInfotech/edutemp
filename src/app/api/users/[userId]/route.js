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

// Base schema for user updates
const baseUserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    name: z.string().optional(),
    profilePicture: z.string().optional(),
});

// Schema for student updates
const studentSchema = baseUserSchema.extend({
    studentdatafull: z.object({
        name: z.string().optional(),
        admissionNo: z.string().optional(),
        academicYear: z.string().optional(),
        dob: z.coerce.date().optional(),
        gender: z.string().toUpperCase().optional(),
        address: z.string().optional(),
        FatherName: z.string().optional(),
        MotherName: z.string().optional(),
        FatherNumber: z.string().optional(),
        MotherNumber: z.string().optional(),
        GuardianName: z.string().optional(),
        GuardianRelation: z.string().optional(),
        bloodGroup: z.string().optional(),
        contactNumber: z.string().optional(),
        rollNumber: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        postalCode: z.string().optional(),
        DateOfLeaving: z.coerce.date().optional().nullable(),
        House: z.string().optional(),
        PreviousSchoolName: z.string().optional(),
        admissionDate: z.coerce.date().optional(),
        FeeStatus: z.enum(["PAID", "UNPAID", "PENDING"]).optional(),
        classId: z.coerce.number().optional(),
        sectionId: z.coerce.number().optional(),
    }).optional(),
});

// Schema for teacher updates
const teacherSchema = baseUserSchema.extend({
    teacherdata: z.object({
        name: z.string().optional(),
        designation: z.string().optional(),
        employeeId: z.string().optional(),
        gender: z.string().optional(),
        age: z.string().optional(),
        bloodGroup: z.string().optional(),
        contactNumber: z.string().optional(),
        dob: z.coerce.date().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        City: z.string().optional(),
        district: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        PostalCode: z.string().optional(),
    }).optional(),
});

// Schema for non-teaching staff updates
const staffSchema = baseUserSchema.extend({
    nonTeachingStaff: z.object({
        name: z.string().optional(),
        designation: z.string().optional(),
        employeeId: z.string().optional(),
        gender: z.string().optional(),
        age: z.string().optional(),
        bloodGroup: z.string().optional(),
        contactNumber: z.string().optional(),
        dob: z.coerce.date().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        City: z.string().optional(),
        district: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        PostalCode: z.string().optional(),
    }).optional(),
});

// Schema for parent updates
const parentSchema = baseUserSchema.extend({
    guardianName: z.string().optional(),
    childId: z.string().uuid().optional(),
});

// Schema for admin updates
const adminSchema = baseUserSchema.extend({
    adminData: z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        schoolId: z.string().uuid().optional(),
        domain: z.string().optional(),
        Language: z.string().optional(),
    }).optional(),
});

// Schema for super admin updates
const superAdminSchema = baseUserSchema.extend({
    name: z.string().optional(),
    email: z.string().email().optional(),
});

export async function PATCH(req, props) {
    const params = await props.params;
    try {
        const userId = params.userId;
        const body = await req.json();
        console.log("Request body:", body); // Debug: Log incoming payload

        // Fetch existing user to determine role
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true, school: true },
        });

        if (!existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const mappedRole = existingUser.role.name;
        console.log(mappedRole, 'mapped role')
        let parsed;

        // Validate payload based on role
        switch (mappedRole) {
            case "STUDENT":
                parsed = studentSchema.parse(body);
                break;
            case "TEACHING_STAFF":
                parsed = teacherSchema.parse(body);
                break;
            case "NON_TEACHING_STAFF":
                parsed = staffSchema.parse(body);
                break;
            case "PARENT":
                parsed = parentSchema.parse(body);
                break;
            case "ADMIN":
                parsed = adminSchema.parse(body);
                // If adminData contains name, move it to parsed.name for User model
                if (parsed.adminData?.name) {
                    parsed.name = parsed.adminData.name;
                    delete parsed.adminData.name;
                    console.log("Moved adminData.name to parsed.name:", parsed.name); // Debug
                }
                break;
            case "LIBRARIAN":
                parsed = baseUserSchema.parse(body);
                break;
            case "ACCOUNTANT":
                parsed = baseUserSchema.parse(body);
                break;
            case "SUPER_ADMIN":
                parsed = superAdminSchema.parse(body);
                break;
            default:
                return NextResponse.json({ error: "Unsupported role" }, { status: 400 });
        }

        console.log("Parsed data:", parsed); // Debug: Log parsed data after validation

        // Update Supabase user if email or password is provided
        if (parsed.email || parsed.password) {
            const updateData = {};
            if (parsed.email) updateData.email = parsed.email;
            if (parsed.password) updateData.password = parsed.password;

            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);
            if (authError) {
                throw new Error(`Supabase Auth Error: ${authError.message}`);
            }
        }

        // Perform Prisma transaction to update user and role-specific data
        const updated = await prisma.$transaction(async (tx) => {
            // Update User model for common fields
            const userUpdateData = {
                ...(parsed.email && { email: parsed.email }),
                ...(parsed.password && { password: parsed.password }),
                ...(parsed.name && { name: parsed.name }),
                ...(parsed.profilePicture && { profilePicture: parsed.profilePicture }),
            };

            console.log("userUpdateData:", userUpdateData); // Debug: Log data to be updated in User model

            const user = Object.keys(userUpdateData).length
                ? await tx.user.update({
                    where: { id: userId },
                    data: userUpdateData,
                    include: { role: true, school: true },
                })
                : existingUser;

            let profile = null;

            // Update role-specific model
            switch (mappedRole) {
                case "STUDENT":
                    if (parsed.studentdatafull) {
                        profile = await tx.student.update({
                            where: { userId },
                            data: {
                                ...(parsed.studentdatafull.name && { name: parsed.studentdatafull.name }),
                                ...(parsed.studentdatafull.admissionNo && { admissionNo: parsed.studentdatafull.admissionNo }),
                                ...(parsed.studentdatafull.academicYear && { academicYear: parsed.studentdatafull.academicYear }),
                                ...(parsed.studentdatafull.dob && { dob: parsed.studentdatafull.dob.toISOString() }),
                                ...(parsed.studentdatafull.gender && { gender: parsed.studentdatafull.gender }),
                                ...(parsed.studentdatafull.address && { Address: parsed.studentdatafull.address }),
                                ...(parsed.studentdatafull.FatherName && { FatherName: parsed.studentdatafull.FatherName }),
                                ...(parsed.studentdatafull.MotherName && { MotherName: parsed.studentdatafull.MotherName }),
                                ...(parsed.studentdatafull.FatherNumber && { FatherNumber: parsed.studentdatafull.FatherNumber }),
                                ...(parsed.studentdatafull.MotherNumber && { MotherNumber: parsed.studentdatafull.MotherNumber }),
                                ...(parsed.studentdatafull.GuardianName && { GuardianName: parsed.studentdatafull.GuardianName }),
                                ...(parsed.studentdatafull.GuardianRelation && { GuardianRelation: parsed.studentdatafull.GuardianRelation }),
                                ...(parsed.studentdatafull.bloodGroup && { bloodGroup: parsed.studentdatafull.bloodGroup }),
                                ...(parsed.studentdatafull.contactNumber && { contactNumber: parsed.studentdatafull.contactNumber }),
                                ...(parsed.studentdatafull.rollNumber && { rollNumber: parsed.studentdatafull.rollNumber }),
                                ...(parsed.studentdatafull.city && { city: parsed.studentdatafull.city }),
                                ...(parsed.studentdatafull.state && { state: parsed.studentdatafull.state }),
                                ...(parsed.studentdatafull.country && { country: parsed.studentdatafull.country }),
                                ...(parsed.studentdatafull.postalCode && { postalCode: parsed.studentdatafull.postalCode }),
                                ...(parsed.studentdatafull.DateOfLeaving && { DateOfLeaving: parsed.studentdatafull.DateOfLeaving }),
                                ...(parsed.studentdatafull.House && { House: parsed.studentdatafull.House }),
                                ...(parsed.studentdatafull.PreviousSchoolName && { PreviousSchoolName: parsed.studentdatafull.PreviousSchoolName }),
                                ...(parsed.studentdatafull.admissionDate && { admissionDate: parsed.studentdatafull.admissionDate.toISOString() }),
                                ...(parsed.studentdatafull.FeeStatus && { FeeStatus: parsed.studentdatafull.FeeStatus }),
                                ...(parsed.studentdatafull.classId && { class: { connect: { id: parsed.studentdatafull.classId } } }),
                                ...(parsed.studentdatafull.sectionId && { section: { connect: { id: parsed.studentdatafull.sectionId } } }),
                            },
                        });
                    }
                    break;

                case "TEACHING_STAFF":
                    if (parsed.teacherdata) {
                        profile = await tx.teachingStaff.update({
                            where: { userId },
                            data: {
                                ...(parsed.teacherdata.name && { name: parsed.teacherdata.name }),
                                ...(parsed.teacherdata.designation && { designation: parsed.teacherdata.designation }),
                                ...(parsed.teacherdata.employeeId && { employeeId: parsed.teacherdata.employeeId }),
                                ...(parsed.teacherdata.gender && { gender: parsed.teacherdata.gender }),
                                ...(parsed.teacherdata.age && { age: parsed.teacherdata.age }),
                                ...(parsed.teacherdata.bloodGroup && { bloodGroup: parsed.teacherdata.bloodGroup }),
                                ...(parsed.teacherdata.contactNumber && { contactNumber: parsed.teacherdata.contactNumber }),
                                ...(parsed.teacherdata.dob && { dob: parsed.teacherdata.dob.toISOString() }),
                                ...(parsed.teacherdata.email && { email: parsed.teacherdata.email }),
                                ...(parsed.teacherdata.address && { address: parsed.teacherdata.address }),
                                ...(parsed.teacherdata.City && { City: parsed.teacherdata.City }),
                                ...(parsed.teacherdata.district && { district: parsed.teacherdata.district }),
                                ...(parsed.teacherdata.state && { state: parsed.teacherdata.state }),
                                ...(parsed.teacherdata.country && { country: parsed.teacherdata.country }),
                                ...(parsed.teacherdata.PostalCode && { PostalCode: parsed.teacherdata.PostalCode }),
                            },
                        });
                    }
                    break;

                case "NON_TEACHING_STAFF":
                    if (parsed.nonTeachingStaff) {
                        profile = await tx.nonTeachingStaff.update({
                            where: { userId },
                            data: {
                                ...(parsed.nonTeachingStaff.name && { name: parsed.nonTeachingStaff.name }),
                                ...(parsed.nonTeachingStaff.designation && { designation: parsed.nonTeachingStaff.designation }),
                                ...(parsed.nonTeachingStaff.employeeId && { employeeId: parsed.nonTeachingStaff.employeeId }),
                                ...(parsed.nonTeachingStaff.gender && { gender: parsed.nonTeachingStaff.gender }),
                                ...(parsed.nonTeachingStaff.age && { age: parsed.nonTeachingStaff.age }),
                                ...(parsed.nonTeachingStaff.bloodGroup && { bloodGroup: parsed.nonTeachingStaff.bloodGroup }),
                                ...(parsed.nonTeachingStaff.contactNumber && { contactNumber: parsed.nonTeachingStaff.contactNumber }),
                                ...(parsed.nonTeachingStaff.dob && { dob: parsed.nonTeachingStaff.dob.toISOString() }),
                                ...(parsed.nonTeachingStaff.email && { email: parsed.nonTeachingStaff.email }),
                                ...(parsed.nonTeachingStaff.address && { address: parsed.nonTeachingStaff.address }),
                                ...(parsed.nonTeachingStaff.City && { City: parsed.nonTeachingStaff.City }),
                                ...(parsed.nonTeachingStaff.district && { district: parsed.nonTeachingStaff.district }),
                                ...(parsed.nonTeachingStaff.state && { state: parsed.nonTeachingStaff.state }),
                                ...(parsed.nonTeachingStaff.country && { country: parsed.nonTeachingStaff.country }),
                                ...(parsed.nonTeachingStaff.PostalCode && { PostalCode: parsed.nonTeachingStaff.PostalCode }),
                            },
                        });
                    }
                    break;

                case "PARENT":
                    if (parsed.guardianName || parsed.childId) {
                        profile = await tx.parent.update({
                            where: { userId },
                            data: {
                                ...(parsed.guardianName && { guardianName: parsed.guardianName }),
                                ...(parsed.childId && { students: { connect: { userId: parsed.childId } } }),
                            },
                        });
                    }
                    break;

                case "ADMIN":
                    if (parsed.adminData) {
                        profile = await tx.admin.update({
                            where: { userId },
                            data: {
                                ...(parsed.adminData.email && { email: parsed.adminData.email }),
                                ...(parsed.adminData.schoolId && { schoolId: parsed.adminData.schoolId }),
                                ...(parsed.adminData.domain && { domain: parsed.adminData.domain }),
                                ...(parsed.adminData.Language && { Language: parsed.adminData.Language }),
                            },
                        });
                    }
                    break;

                case "SUPER_ADMIN":
                    profile = user; // SUPER_ADMIN only updates User model fields
                    break;
            }

            return { user, profile };
        }, {
            timeout: 10000 // 10 seconds
        });

        return NextResponse.json({ success: true, ...updated });
    } catch (error) {
        console.error("❌ User profile update error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update profile" },
            { status: 500 }
        );
    }
}