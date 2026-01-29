import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications/notificationHelper';

// GET - Fetch parent feedback for a student
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { studentId, termNumber, academicYearId, parentId } = searchParams;

    if (!schoolId || !studentId) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    try {
        const whereClause = {
            studentId,
            ...(termNumber && { termNumber: parseInt(termNumber) }),
            ...(academicYearId && { academicYearId }),
            ...(parentId && { parentId }),
        };

        const feedback = await prisma.parentFeedback.findMany({
            where: whereClause,
            include: {
                parent: {
                    include: {
                        user: { select: { name: true } }
                    }
                }
            },
            orderBy: { submittedAt: 'desc' }
        });

        return NextResponse.json({ feedback });
    } catch (err) {
        console.error("Error fetching parent feedback:", err);
        return NextResponse.json(
            { error: "Failed to fetch parent feedback", message: err.message },
            { status: 500 }
        );
    }
}

// POST - Submit parent feedback
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();

    const {
        studentId,
        parentId,
        academicYearId,
        termNumber,
        childInterest,      // "High", "Moderate", "Low"
        homeParticipation,  // "Active", "Needs Encouragement"
        observations,
        suggestions
    } = body;

    if (!schoolId || !studentId || !parentId || !academicYearId || !termNumber) {
        return NextResponse.json(
            { error: 'Missing required fields. Required: studentId, parentId, academicYearId, termNumber' },
            { status: 400 }
        );
    }

    // Resolve the correct parentId - might be Parent.id or User.id
    let resolvedParentId = parentId;

    // First, check if the provided ID is a valid Parent record
    const existingParent = await prisma.parent.findUnique({
        where: { id: parentId },
        select: { id: true }
    });

    // If not found, try to look up Parent by userId
    if (!existingParent) {
        const parentByUserId = await prisma.parent.findFirst({
            where: { userId: parentId },
            select: { id: true }
        });

        if (parentByUserId) {
            resolvedParentId = parentByUserId.id;
        } else {
            return NextResponse.json(
                { error: 'Parent not found. Please ensure your profile is properly linked.' },
                { status: 404 }
            );
        }
    }

    try {
        // Upsert - update if exists, create if new
        const feedback = await prisma.parentFeedback.upsert({
            where: {
                studentId_parentId_academicYearId_termNumber: {
                    studentId,
                    parentId: resolvedParentId,
                    academicYearId,
                    termNumber: parseInt(termNumber)
                }
            },
            update: {
                childInterest: childInterest || null,
                homeParticipation: homeParticipation || null,
                observations: observations || null,
                suggestions: suggestions || null,
                submittedAt: new Date()
            },
            create: {
                studentId,
                parentId: resolvedParentId,
                academicYearId,
                termNumber: parseInt(termNumber),
                childInterest: childInterest || null,
                homeParticipation: homeParticipation || null,
                observations: observations || null,
                suggestions: suggestions || null
            }
        });

        // Send Notification to Class Teacher
        try {
            // Get student details to find the class teacher/section teacher and student name
            const student = await prisma.student.findUnique({
                where: { userId: studentId },
                include: {
                    user: { select: { name: true } },
                    class: { select: { teachingStaffUserId: true, className: true } },
                    section: { select: { teachingStaffUserId: true, name: true } }
                }
            });

            if (student) {
                // Prioritize Section Teacher, then Class Teacher
                const teacherUserId = student.section?.teachingStaffUserId || student.class?.teachingStaffUserId;
                const studentName = student.user?.name || 'Student';
                const className = `${student.class?.className || ''} ${student.section?.name || ''}`.trim();

                if (teacherUserId) {
                    await sendNotification({
                        schoolId,
                        title: `New Parent Feedback`,
                        message: `${studentName} (${className}) has new feedback from parent.`,
                        type: 'HPC_FEEDBACK',
                        priority: 'HIGH',
                        targetOptions: {
                            userIds: [teacherUserId] // Send to specific teacher
                        },
                        senderId: parentId, // Note: using the input parentId which is likely a User ID or Parent ID
                        metadata: {
                            studentId,
                            termNumber,
                            feedbackType: 'PARENT'
                        },
                        actionUrl: `/hpc/teacher-narrative?studentId=${studentId}&termNumber=${termNumber}` // Deep link
                    });
                }
            }
        } catch (notifError) {
            console.error('Failed to send teacher notification:', notifError);
            // Don't fail the request if notification fails
        }

        return NextResponse.json({
            success: true,
            message: "Parent feedback submitted successfully",
            feedback
        });
    } catch (err) {
        console.error("Error submitting parent feedback:", err);
        return NextResponse.json(
            { error: "Failed to submit parent feedback", message: err.message },
            { status: 500 }
        );
    }
}
