import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supbase-admin";

// POST: Move application to a different stage
export async function POST(req, { params }) {
    const { id } = await params;
    let createdUserId = null;

    try {
        const body = await req.json();
        const { stageId, movedById, stageData } = body;

        if (!stageId) {
            return NextResponse.json(
                { error: "stageId is required" },
                { status: 400 }
            );
        }

        // Update application's current stage
        const application = await prisma.application.update({
            where: { id },
            data: {
                currentStageId: stageId,
            },
        });

        // Create stage history entry
        await prisma.stageHistory.create({
            data: {
                applicationId: id,
                stageId,
                movedById,
                notes: stageData?.notes || stageData?.rejectionReason || null,
                testDate: stageData?.testDate ? new Date(stageData.testDate) : null,
                testStartTime: stageData?.testStartTime || null,
                testEndTime: stageData?.testEndTime || null,
                testVenue: stageData?.testVenue || null,
                testScore: stageData?.testScore ? Number(stageData.testScore) : null,
                testPassed: stageData?.testResult === "pass" ? true : stageData?.testResult === "fail" ? false : null,
            },
        });

        // Check if the target stage is "ENROLLED"
        const targetStage = await prisma.stage.findUnique({
            where: { id: stageId },
        });

        if (targetStage && (targetStage.name.toUpperCase() === "ENROLLED" || targetStage.name.toUpperCase() === "ENROLLMENT")) {
            // Validate required fields
            if (!stageData.admissionNo || !stageData.classId || !stageData.sectionId) {
                throw new Error("Missing required enrollment data: admissionNo, classId, or sectionId");
            }

            // Fetch the application to get details
            const appDetails = await prisma.application.findUnique({ where: { id } });

            // Find active academic year
            const activeAcademicYear = await prisma.academicYear.findFirst({
                where: { schoolId: appDetails.schoolId, isActive: true },
            });

            if (!activeAcademicYear) {
                throw new Error("No active academic year found. Please create one before enrolling students.");
            }

            // Generate email if not provided
            const studentEmail = appDetails.applicantEmail;
            const studentPassword = stageData.password || `${stageData.admissionNo}@123`; // Default password

            // Create Supabase auth user
            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: studentEmail,
                password: studentPassword,
                email_confirm: true,
            });

            if (authError || !authUser?.user?.id) {
                throw new Error(`Supabase Auth Error: ${authError?.message || "Unknown error"}`);
            }

            createdUserId = authUser.user.id;

            // Create User and Student in a transaction
            await prisma.$transaction(async (tx) => {
                // Ensure STUDENT role exists
                const studentRole = await tx.role.upsert({
                    where: { name: "STUDENT" },
                    update: {},
                    create: { name: "STUDENT" },
                });

                // Create User record
                await tx.user.create({
                    data: {
                        id: createdUserId,
                        password: studentPassword,
                        profilePicture: "default.png",
                        name: stageData.studentName || appDetails.applicantName,
                        email: studentEmail,
                        school: { connect: { id: appDetails.schoolId } },
                        role: { connect: { id: studentRole.id } },
                    },
                });

                // Create Student record
                await tx.student.create({
                    data: {
                        userId: createdUserId,
                        schoolId: appDetails.schoolId,
                        admissionNo: stageData.admissionNo,
                        name: stageData.studentName || appDetails.applicantName,
                        classId: parseInt(stageData.classId),
                        sectionId: parseInt(stageData.sectionId),
                        rollNumber: stageData.rollNumber || "",
                        dob: stageData.dob || "",
                        gender: stageData.gender || "",
                        email: studentEmail,
                        contactNumber: stageData.fatherMobileNumber || stageData.motherMobileNumber || stageData.guardianMobileNo || "",

                        // Parent Details
                        FatherName: stageData.fatherName || "",
                        FatherNumber: stageData.fatherMobileNumber || "",
                        MotherName: stageData.motherName || "",
                        MotherNumber: stageData.motherMobileNumber || "",
                        GuardianName: stageData.guardianName || "",
                        GuardianRelation: stageData.guardianRelation || "",

                        // Defaults/Placeholders for required fields
                        admissionDate: stageData.admissionDate || new Date().toISOString().split('T')[0],
                        bloodGroup: "",
                        Address: "",
                        city: "",
                        state: "",
                        country: "",
                        postalCode: "",
                        academicYearId: activeAcademicYear.id,
                    }
                });
            });
        }

        return NextResponse.json({ application });
    } catch (error) {
        console.error("Error moving application:", error);

        // Cleanup: Delete the Supabase auth user if it was created
        if (createdUserId) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(createdUserId);
                console.log(`Cleaned up Supabase user: ${createdUserId}`);
            } catch (cleanupError) {
                console.error("Failed to cleanup Supabase user:", cleanupError);
            }
        }

        return NextResponse.json(
            { error: error.message || "Failed to move application" },
            { status: 500 }
        );
    }
}
