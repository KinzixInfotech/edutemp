import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";
import { verifyRoleAccess } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supbase-admin";
import { z } from "zod";
import { differenceInYears } from "date-fns";

const studentSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    studentName: z.string(),
    admissionNo: z.string(),
    dob: z.coerce.date().optional().nullable(),
    profilePicture: z.string().optional().nullable(),
    gender: z.string().toUpperCase(),
    address: z.string().optional().default(""),
    fatherName: z.string().optional(),
    motherName: z.string().optional(),
    fatherMobileNumber: z.string().optional(),
    motherMobileNumber: z.string().optional(),
    guardianType: z.enum(["PARENTS", "GUARDIAN"]).optional().default("PARENTS"),
    guardianName: z.string().optional(),
    guardianRelation: z.string().optional(),
    guardianMobileNo: z.string().optional(),
    linkedParentId: z.string().optional(),
    createParentProfile: z.boolean().optional().default(false),
    parentName: z.string().optional(),
    parentEmail: z.string().email().optional().or(z.literal('')),
    parentContactNumber: z.string().optional(),
    parentPassword: z.string().min(6).optional().or(z.literal('')),
    parentRelation: z.enum(["FATHER", "MOTHER", "GUARDIAN", "GRANDFATHER", "GRANDMOTHER", "UNCLE", "AUNT", "SIBLING", "OTHER"]).optional().default("GUARDIAN"),
    bloodGroup: z.string().optional(),
    contactNumber: z.string().optional(),
    classId: z.coerce.number(),
    sectionId: z.string().or(z.number().transform(Number)),
    rollNumber: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    admissionDate: z.coerce.date().optional(),
});

// GET - Get all students in teacher's classes with attendance percentage
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId, userId: teacherId } = params;

        const cacheKey = generateKey('teacher:students:v2', { schoolId, teacherId });

        const result = await remember(cacheKey, async () => {
            // 1. Get teacher's assigned classes and sections IDs
            const teacher = await prisma.teachingStaff.findUnique({
                where: { userId: teacherId },
                include: {
                    Class: {
                        where: { schoolId },
                        select: { id: true, className: true }
                    },
                    sectionsAssigned: {
                        where: { schoolId },
                        select: { id: true, name: true, class: { select: { className: true } } }
                    }
                }
            });

            if (!teacher) {
                return { students: [] };
            }

            const classIds = teacher.Class.map(c => c.id);
            const sectionIds = teacher.sectionsAssigned.map(s => s.id);

            if (classIds.length === 0 && sectionIds.length === 0) {
                return { students: [] };
            }

            // 2. Query Student model directly
            const rawStudents = await prisma.student.findMany({
                where: {
                    schoolId,
                    OR: [
                        { sectionId: { in: sectionIds } },
                        { classId: { in: classIds } }
                    ],
                    // Removed isAlumni, using user status instead to match bulk attendance logic
                    user: {
                        status: 'ACTIVE',
                        deletedAt: null
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            profilePicture: true,
                        }
                    },
                    section: {
                        select: {
                            id: true,
                            name: true,
                            class: {
                                select: { className: true }
                            }
                        }
                    },
                    class: {
                        select: {
                            id: true,
                            className: true
                        }
                    }
                }
            });

            // Map to standard format
            const students = rawStudents.map(student => {
                const className = student.section?.class?.className || student.class?.className || '';
                const sectionName = student.section?.name || '';
                const sectionId = student.sectionId;

                return {
                    id: student.user.id,
                    studentId: student.id,
                    name: student.user.name,
                    email: student.user.email,
                    profilePicture: student.user.profilePicture,
                    rollNumber: student.rollNumber,
                    admissionNo: student.admissionNo,
                    sectionId: sectionId,
                    sectionName: sectionName,
                    className: className
                };
            });

            // Get academic year start
            const school = await prisma.school.findUnique({
                where: { id: schoolId },
                select: {
                    AcademicYear: {
                        select: { startDate: true },
                        orderBy: { startDate: 'desc' },
                        take: 1
                    }
                }
            });

            const now = new Date();
            let academicYearStart;

            if (school?.AcademicYear && school.AcademicYear.length > 0) {
                academicYearStart = new Date(school.AcademicYear[0].startDate);
            } else {
                const currentYear = now.getFullYear();
                academicYearStart = new Date(currentYear - (now.getMonth() < 3 ? 1 : 0), 3, 1);
            }

            // Calculate attendance
            const studentsWithAttendance = await Promise.all(
                students.map(async (student) => {
                    let startDate = academicYearStart;
                    const studentRecord = rawStudents.find(s => s.id === student.studentId);

                    if (studentRecord?.admissionDate) {
                        const admissionDate = new Date(studentRecord.admissionDate);
                        if (admissionDate > academicYearStart) {
                            startDate = admissionDate;
                        }
                    }

                    const attendanceRecords = await prisma.attendance.findMany({
                        where: {
                            userId: student.id,
                            schoolId,
                            date: { gte: startDate, lte: now }
                        },
                        select: { status: true }
                    });

                    const totalDays = attendanceRecords.length;
                    const presentDays = attendanceRecords.filter(r => ['PRESENT', 'LATE'].includes(r.status)).length;
                    const attendancePercent = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

                    return {
                        ...student,
                        attendancePercent: Math.round(attendancePercent * 100) / 100,
                        totalDaysMarked: totalDays,
                        totalPresent: presentDays
                    };
                })
            );

            return {
                students: studentsWithAttendance.sort((a, b) => {
                    const rollA = parseInt(a.rollNumber) || 9999;
                    const rollB = parseInt(b.rollNumber) || 9999;
                    return rollA - rollB;
                })
            };
        }, 300); // Cache for 5 minutes

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching teacher's students:", error);
        return NextResponse.json(
            { error: "Failed to fetch students" },
            { status: 500 }
        );
    }
}

// POST - Teacher creates a student
export async function POST(req, props) {
    let createdUserId = null;
    let createdParentUserId = null;
    try {
        const params = await props.params;
        const { schoolId, userId: teacherId } = params;

        // Verify caller is a teacher and belongs to this school
        const auth = await verifyRoleAccess(req, ['TEACHING_STAFF'], schoolId);
        if (auth.error) return auth.response;

        const body = await req.json();
        const parsed = studentSchema.parse(body);

        // 1. Validate if teacher has permission to add student to this class & section
        const teacher = await prisma.teachingStaff.findUnique({
            where: { userId: teacherId },
            include: {
                Class: { where: { schoolId }, select: { id: true } },
                sectionsAssigned: { where: { schoolId }, select: { id: true, classId: true } }
            }
        });

        if (!teacher) {
            return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
        }

        const classIds = teacher.Class.map(c => c.id);
        const sectionIds = teacher.sectionsAssigned.map(s => s.id);
        
        // A teacher can create a student if they are assigned to that specific section, 
        // OR if they are assigned to the entire class.
        const hasAccess = sectionIds.includes(parsed.sectionId) || classIds.includes(parsed.classId);

        if (!hasAccess) {
            return NextResponse.json(
                { error: "Unauthorized: You can only create students for your assigned classes/sections" },
                { status: 403 }
            );
        }

        // 2. Additional Validations (Duplicate check, Age)
        const existingUser = await prisma.user.findUnique({
            where: { email: parsed.email },
        });
        if (existingUser) {
            return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
        }

        if (parsed.contactNumber && parsed.contactNumber.length >= 10) {
            const phoneExists = await prisma.student.findFirst({
                where: { schoolId, contactNumber: parsed.contactNumber },
            });
            if (phoneExists) {
                return NextResponse.json(
                    { error: "A student with this contact number already exists in this school" },
                    { status: 409 }
                );
            }
        }

        if (parsed.dob) {
            const age = differenceInYears(new Date(), new Date(parsed.dob));
            if (age < 3 || age > 100 || new Date(parsed.dob) > new Date()) {
                return NextResponse.json({ error: "Invalid date of birth" }, { status: 400 });
            }
        }

        // 3. Find Active Academic Year
        const activeAcademicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
        });
        if (!activeAcademicYear) {
            throw new Error("No active academic year found");
        }

        // 4. Handle Parent Profile Creation in Supabase (if needed)
        if (parsed.createParentProfile) {
            if (!parsed.parentName || !parsed.parentEmail || !parsed.parentPassword || !parsed.parentContactNumber) {
                return NextResponse.json({ error: "Missing parent profile details" }, { status: 400 });
            }
            
            const existingParentUser = await prisma.user.findUnique({ where: { email: parsed.parentEmail } });
            if (existingParentUser) {
                return NextResponse.json({ error: "A user with this parent email already exists" }, { status: 409 });
            }
            
            const existingParentPhone = await prisma.parent.findFirst({ where: { schoolId, contactNumber: parsed.parentContactNumber }});
            if (existingParentPhone) {
                return NextResponse.json({ error: "A parent with this contact number already exists" }, { status: 409 });
            }

            const { data: parentAuth, error: parentAuthError } = await supabaseAdmin.auth.admin.createUser({
                user_metadata: { name: parsed.parentName },
                email: parsed.parentEmail,
                password: parsed.parentPassword,
                email_confirm: true,
            });

            if (parentAuthError || !parentAuth?.user?.id) {
                throw new Error(`Parent Supabase Auth Error: ${parentAuthError?.message || "Unknown error"}`);
            }

            createdParentUserId = parentAuth.user.id;
        }

        // 5. Create Student in Supabase
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            user_metadata: { name: parsed.studentName },
            email: parsed.email,
            password: parsed.password,
            email_confirm: true,
        });

        if (authError || !authUser?.user?.id) {
            throw new Error(`Supabase Auth Error: ${authError?.message || "Unknown error"}`);
        }

        createdUserId = authUser.user.id;

        // 5. Create in Prisma
        const created = await prisma.$transaction(async (tx) => {
            const role = await tx.role.upsert({
                where: { name: "STUDENT" },
                update: {},
                create: { name: "STUDENT" },
            });

            const user = await tx.user.create({
                data: {
                    id: createdUserId,
                    password: parsed.password,
                    profilePicture: parsed.profilePicture || "default.png",
                    name: parsed.studentName,
                    email: parsed.email,
                    school: { connect: { id: schoolId } },
                    role: { connect: { id: role.id } },
                },
            });

            const profile = await tx.student.create({
                data: {
                    name: parsed.studentName,
                    admissionNo: parsed.admissionNo,
                    AcademicYear: { connect: { id: activeAcademicYear.id } },
                    school: { connect: { id: schoolId } },
                    user: { connect: { id: user.id } },
                    class: { connect: { id: parsed.classId } },
                    section: { connect: { id: Number(parsed.sectionId) } },
                    dob: parsed.dob ? parsed.dob.toISOString() : "",
                    gender: parsed.gender,
                    Address: parsed.address || "",
                    FatherName: parsed.fatherName || "",
                    MotherName: parsed.motherName || "",
                    FatherNumber: parsed.fatherMobileNumber || "",
                    MotherNumber: parsed.motherMobileNumber || "",
                    bloodGroup: parsed.bloodGroup || "",
                    contactNumber: parsed.contactNumber || "",
                    email: parsed.email,
                    admissionDate: parsed.admissionDate?.toISOString() || new Date().toISOString(),
                    rollNumber: parsed.rollNumber || "",
                    city: parsed.city || "",
                    state: parsed.state || "",
                    country: parsed.country || "",
                    postalCode: parsed.postalCode || "",
                    GuardianName: parsed.guardianName || "",
                    GuardianRelation: parsed.guardianRelation || "",
                },
            });

            // Handle Parent Profile Creation / Linking
            let finalParentId = parsed.linkedParentId;

            if (parsed.createParentProfile && createdParentUserId) {
                const parentRole = await tx.role.upsert({
                    where: { name: "PARENT" },
                    update: {},
                    create: { name: "PARENT" },
                });

                await tx.user.create({
                    data: {
                        id: createdParentUserId,
                        password: parsed.parentPassword,
                        profilePicture: "default.png",
                        name: parsed.parentName,
                        email: parsed.parentEmail,
                        school: { connect: { id: schoolId } },
                        role: { connect: { id: parentRole.id } },
                    },
                });

                const newParent = await tx.parent.create({
                    data: {
                        userId: createdParentUserId,
                        schoolId: schoolId,
                        name: parsed.parentName,
                        email: parsed.parentEmail,
                        contactNumber: parsed.parentContactNumber,
                    }
                });
                
                finalParentId = newParent.id;
            }

            // Create Link if a parent ID exists
            if (finalParentId) {
                await tx.studentParentLink.create({
                    data: {
                        studentId: profile.userId,
                        parentId: finalParentId,
                        relation: parsed.parentRelation || "GUARDIAN",
                        isPrimary: true,
                    }
                });

                // Update physical parentId field on Student model just in case it's used elsewhere
                await tx.student.update({
                    where: { userId: profile.userId },
                    data: { parentId: finalParentId }
                });
            }

            return { user, profile };
        });

        // Track photo
        if (parsed.profilePicture && parsed.profilePicture.includes('r2.edubreezy.com')) {
            try {
                await prisma.upload.create({
                    data: {
                        schoolId,
                        fileUrl: parsed.profilePicture,
                        fileName: `Profile Picture - ${parsed.studentName}`,
                        mimeType: "image/jpeg",
                        size: 0,
                    },
                });
            } catch (err) {}
        }

        // Invalidate caches
        try {
            await invalidatePattern(`students*`);
            await invalidatePattern(`teacher:students*`);
        } catch (err) {}

        return NextResponse.json({ success: true, ...created });

    } catch (error) {
        console.error("❌ Teacher Student creation error:", error);
        if (createdUserId) {
            try { await supabaseAdmin.auth.admin.deleteUser(createdUserId); } catch (e) {}
        }
        if (createdParentUserId) {
            try { await supabaseAdmin.auth.admin.deleteUser(createdParentUserId); } catch (e) {}
        }
        
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
        }

        if (error?.constructor?.name === "PrismaClientKnownRequestError") {
            if (error.code === "P2002") {
                return NextResponse.json({ error: "Duplicate entry", message: `Admission Number is already in use.` }, { status: 409 });
            }
        }

        return NextResponse.json(
            { error: "Failed to create profile", message: error.message || "Unknown error" },
            { status: 500 }
        );
    }
}
