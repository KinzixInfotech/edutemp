import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get onboarding status with counts
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get("schoolId");

        if (!schoolId) {
            return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
        }

        // Get school with onboarding status and counts
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                id: true,
                name: true,
                onboardingComplete: true,
                onboardingDismissed: true,
                _count: {
                    select: {
                        classes: true,
                        TeachingStaff: true,
                        Student: true,
                        parents: true,
                        NonTeachingStaff: true,
                        FeeStructure: true,
                    }
                }
            }
        });

        if (!school) {
            return NextResponse.json({ error: "School not found" }, { status: 404 });
        }

        // Calculate step statuses
        const steps = [
            {
                id: "classes",
                title: "Classes & Sections",
                description: "Create classes and sections for your school",
                href: "/dashboard/schools/create-classes",
                icon: "GraduationCap",
                count: school._count.classes,
                isComplete: school._count.classes > 0,
            },
            {
                id: "teachers",
                title: "Teaching Staff",
                description: "Add teachers and assign subjects",
                href: "/dashboard/schools/manage-teaching-staff",
                icon: "Users",
                count: school._count.TeachingStaff,
                isComplete: school._count.TeachingStaff > 0,
            },
            {
                id: "students",
                title: "Students",
                description: "Add or import student records",
                href: "/dashboard/schools/manage-student",
                icon: "UserPlus",
                count: school._count.Student,
                isComplete: school._count.Student > 0,
            },
            {
                id: "parents",
                title: "Parents",
                description: "Add parent accounts for communication",
                href: "/dashboard/schools/manage-parent",
                icon: "UserCheck",
                count: school._count.parents,
                isComplete: school._count.parents > 0,
            },
            {
                id: "nonTeachingStaff",
                title: "Non-Teaching Staff",
                description: "Add administrative and support staff",
                href: "/dashboard/schools/manage-non-teaching-staff",
                icon: "Briefcase",
                count: school._count.NonTeachingStaff,
                isComplete: school._count.NonTeachingStaff > 0,
            },
            {
                id: "feeStructure",
                title: "Fee Structure",
                description: "Set up fee structures and payment plans",
                href: "/dashboard/fees/manage-fee-structure",
                icon: "IndianRupee",
                count: school._count.FeeStructure,
                isComplete: school._count.FeeStructure > 0,
            },
        ];

        const completedSteps = steps.filter(s => s.isComplete).length;
        const totalSteps = steps.length;
        const allComplete = completedSteps === totalSteps;

        // Handle null values (for existing records before migration)
        const isComplete = school.onboardingComplete === true;
        const isDismissed = school.onboardingDismissed === true;

        return NextResponse.json({
            school: {
                id: school.id,
                name: school.name,
                onboardingComplete: isComplete,
                onboardingDismissed: isDismissed,
            },
            steps,
            progress: {
                completedSteps,
                totalSteps,
                percentage: Math.round((completedSteps / totalSteps) * 100),
                allComplete,
            },
            // Show wizard if: not complete AND not dismissed
            shouldShowWizard: !isComplete && !isDismissed,
            // Show banner if: not complete AND dismissed
            shouldShowBanner: !isComplete && isDismissed,
        });
    } catch (error) {
        console.error("Error fetching onboarding status:", error);
        return NextResponse.json({ error: "Failed to fetch onboarding status" }, { status: 500 });
    }
}

// PATCH - Update onboarding status
export async function PATCH(request) {
    try {
        const body = await request.json();
        const { schoolId, onboardingComplete, onboardingDismissed } = body;

        if (!schoolId) {
            return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
        }

        const updateData = {};
        if (typeof onboardingComplete === "boolean") {
            updateData.onboardingComplete = onboardingComplete;
        }
        if (typeof onboardingDismissed === "boolean") {
            updateData.onboardingDismissed = onboardingDismissed;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const updatedSchool = await prisma.school.update({
            where: { id: schoolId },
            data: updateData,
            select: {
                id: true,
                onboardingComplete: true,
                onboardingDismissed: true,
            }
        });

        return NextResponse.json({
            success: true,
            school: updatedSchool,
        });
    } catch (error) {
        console.error("Error updating onboarding status:", error);
        return NextResponse.json({ error: "Failed to update onboarding status" }, { status: 500 });
    }
}
