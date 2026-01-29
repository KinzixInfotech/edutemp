import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { sendNotification } from '@/lib/notifications/notificationHelper';

// GET - Fetch student reflections
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { studentId, academicYearId, termNumber } = searchParams;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const reflections = await prisma.studentReflection.findMany({
            where: {
                student: { schoolId },
                ...(studentId && { studentId }),
                ...(academicYearId && { academicYearId }),
                ...(termNumber && { termNumber: Number(termNumber) })
            },
            include: {
                student: { select: { name: true, rollNumber: true, admissionNo: true } },
                academicYear: { select: { name: true } }
            },
            orderBy: { submittedAt: "desc" }
        });

        return NextResponse.json({ reflections });
    } catch (err) {
        console.error("Error fetching reflections:", err);
        return NextResponse.json(
            { error: "Failed to fetch reflections", message: err.message },
            { status: 500 }
        );
    }
}

// POST - Submit student self-reflection
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { studentId, academicYearId, termNumber, learnedWell, foundDifficult, wantToImprove, favoriteSubject, goals } = body;

    if (!schoolId || !studentId || !academicYearId || !termNumber || !learnedWell) {
        return NextResponse.json(
            { error: "studentId, academicYearId, termNumber, and learnedWell are required" },
            { status: 400 }
        );
    }

    try {
        // Verify student belongs to school and get teacher info for notification
        const student = await prisma.student.findFirst({
            where: { userId: studentId, schoolId },
            include: {
                user: { select: { name: true } },
                class: { select: { teachingStaffUserId: true, name: true } },
                section: { select: { teachingStaffUserId: true, name: true } }
            }
        });

        if (!student) {
            return NextResponse.json(
                { error: "Student not found in this school" },
                { status: 404 }
            );
        }

        const reflection = await prisma.studentReflection.upsert({
            where: {
                studentId_academicYearId_termNumber: {
                    studentId,
                    academicYearId,
                    termNumber: Number(termNumber)
                }
            },
            update: {
                learnedWell,
                foundDifficult: foundDifficult || null,
                wantToImprove: wantToImprove || null,
                favoriteSubject: favoriteSubject || null,
                goals: goals || null,
                submittedAt: new Date()
            },
            create: {
                studentId,
                academicYearId,
                termNumber: Number(termNumber),
                learnedWell,
                foundDifficult: foundDifficult || null,
                wantToImprove: wantToImprove || null,
                favoriteSubject: favoriteSubject || null,
                goals: goals || null
            }
        });

        // Send Notification to Class Teacher
        try {
            // Prioritize Section Teacher, then Class Teacher
            const teacherUserId = student.section?.teachingStaffUserId || student.class?.teachingStaffUserId;
            const studentName = student.user?.name || 'Student';
            const className = `${student.class?.name || ''} ${student.section?.name || ''}`.trim();

            if (teacherUserId) {
                await sendNotification({
                    schoolId,
                    title: `New Student Reflection`,
                    message: `${studentName} (${className}) has submitted their self-reflection.`,
                    type: 'HPC_REFLECTION',
                    priority: 'HIGH',
                    targetOptions: {
                        userIds: [teacherUserId]
                    },
                    senderId: studentId,
                    metadata: {
                        studentId,
                        termNumber,
                        feedbackType: 'STUDENT'
                    },
                    actionUrl: `/hpc/teacher-narrative?studentId=${studentId}&termNumber=${termNumber}`
                });
            }
        } catch (notifError) {
            console.error('Failed to send teacher notification:', notifError);
            // Don't fail the request if notification fails
        }

        return NextResponse.json({
            message: "Reflection submitted successfully",
            reflection
        });
    } catch (err) {
        console.error("Error submitting reflection:", err);
        return NextResponse.json(
            { error: "Failed to submit reflection", message: err.message },
            { status: 500 }
        );
    }
}
