import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST: Admit a student
export async function POST(req, { params }) {
    const { schoolId } = await params;

    try {
        const body = await req.json();
        const { applicationId, classId, sectionId, admissionNumber } = body;

        if (!applicationId) {
            return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
        }

        // Fetch Application
        const application = await prisma.application.findUnique({
            where: { id: applicationId, schoolId },
            include: { form: true }
        });

        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }

        // Check if student already exists
        const existingStudent = await prisma.student.findFirst({
            where: {
                schoolId,
                email: application.applicantEmail
            }
        });

        if (existingStudent) {
            return NextResponse.json({ error: "Student with this email already exists" }, { status: 400 });
        }

        // Generate default password (e.g., "Student@123")
        const hashedPassword = await bcrypt.hash("Student@123", 10);

        // Create Student
        // Note: We need to map application data to student fields.
        // For now, we'll map basic fields and store the rest in `profile`.
        // We assume the form has fields like "phone", "dob", "address", "gender"
        // or we just take what we can.

        const formData = application.data || {};

        const student = await prisma.student.create({
            data: {
                schoolId,
                firstName: application.applicantName.split(" ")[0],
                lastName: application.applicantName.split(" ").slice(1).join(" ") || "",
                email: application.applicantEmail,
                password: hashedPassword,
                admissionNo: admissionNumber || `ADM-${Date.now().toString().slice(-6)}`,
                rollNo: null, // Can be assigned later
                classId: classId || null,
                sectionId: sectionId || null,
                gender: formData.gender || "Not Specified",
                dob: formData.dob ? new Date(formData.dob) : null,
                phone: formData.phone || null,
                address: formData.address || null,
                status: "ACTIVE",
            },
        });

        // Update Application Stage to "Enrolled"
        const enrolledStage = await prisma.stage.findFirst({
            where: { schoolId, name: "Enrolled" }
        });

        if (enrolledStage) {
            await prisma.application.update({
                where: { id: applicationId },
                data: { currentStageId: enrolledStage.id }
            });

            await prisma.stageHistory.create({
                data: {
                    applicationId,
                    stageId: enrolledStage.id,
                    notes: "Student admitted successfully"
                }
            });
        }

        return NextResponse.json({
            message: "Student admitted successfully",
            studentId: student.id,
            credentials: {
                email: student.email,
                password: "Student@123"
            }
        });

    } catch (error) {
        console.error("Error admitting student:", error);
        return NextResponse.json(
            { error: "Failed to admit student" },
            { status: 500 }
        );
    }
}
