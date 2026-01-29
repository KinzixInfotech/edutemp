import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications/notificationHelper';

// GET - Fetch teacher narrative feedback for a student
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { studentId, termNumber, academicYearId, teacherId } = searchParams;

    if (!schoolId || !studentId) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    try {
        const whereClause = {
            studentId,
            ...(termNumber && { termNumber: parseInt(termNumber) }),
            ...(academicYearId && { academicYearId }),
            ...(teacherId && { teacherId }),
        };

        const feedback = await prisma.teacherFeedback.findMany({
            where: whereClause,
            include: {
                teacher: {
                    include: {
                        user: { select: { name: true, profilePicture: true } }
                    }
                }
            },
            orderBy: { submittedAt: 'desc' }
        });

        return NextResponse.json({ feedback });
    } catch (err) {
        console.error("Error fetching teacher feedback:", err);
        return NextResponse.json(
            { error: "Failed to fetch teacher feedback", message: err.message },
            { status: 500 }
        );
    }
}

// POST - Submit teacher narrative feedback
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();

    const {
        studentId,
        teacherId,
        academicYearId,
        termNumber,
        strengths,
        areasToImprove,
        suggestions,
        overallRemarks
    } = body;

    if (!schoolId || !studentId || !teacherId || !academicYearId || !termNumber || !strengths) {
        return NextResponse.json(
            { error: 'Missing required fields. Required: studentId, teacherId, academicYearId, termNumber, strengths' },
            { status: 400 }
        );
    }

    try {
        // Upsert - update if exists, create if new
        const feedback = await prisma.teacherFeedback.upsert({
            where: {
                studentId_teacherId_academicYearId_termNumber: {
                    studentId,
                    teacherId,
                    academicYearId,
                    termNumber: parseInt(termNumber)
                }
            },
            update: {
                strengths,
                areasToImprove: areasToImprove || null,
                suggestions: suggestions || null,
                overallRemarks: overallRemarks || null,
                submittedAt: new Date()
            },
            create: {
                studentId,
                teacherId,
                academicYearId,
                termNumber: parseInt(termNumber),
                strengths,
                areasToImprove: areasToImprove || null,
                suggestions: suggestions || null,
                overallRemarks: overallRemarks || null
            }
        });

        // Send Notification to Parent(s)
        try {
            // Find parents linked to this student
            const studentWithParents = await prisma.student.findUnique({
                where: { userId: studentId },
                include: {
                    user: { select: { name: true } },
                    parents: {
                        where: { isActive: true },
                        include: {
                            parent: { select: { userId: true } }
                        }
                    }
                }
            });

            if (studentWithParents && studentWithParents.parents.length > 0) {
                const parentUserIds = studentWithParents.parents.map(p => p.parent.userId);
                const studentName = studentWithParents.user?.name || 'Your Child';

                await sendNotification({
                    schoolId,
                    title: 'New Teacher Feedback',
                    message: `${studentName} has received new narrative feedback for Term ${termNumber}.`,
                    type: 'HPC_FEEDBACK',
                    priority: 'HIGH',
                    targetOptions: {
                        userIds: parentUserIds // Send to all linked parents
                    },
                    senderId: teacherId, // Teacher is sender
                    metadata: {
                        studentId,
                        termNumber,
                        feedbackType: 'TEACHER'
                    },
                    actionUrl: `/hpc/parent-view?childId=${studentId}&termNumber=${termNumber}` // Deep link to parent view
                });
            }
        } catch (notifError) {
            console.error('Failed to send parent notification:', notifError);
            // Don't fail the request if notification fails
        }

        return NextResponse.json({
            success: true,
            message: "Teacher feedback submitted successfully",
            feedback
        });
    } catch (err) {
        console.error("Error submitting teacher feedback:", err);
        return NextResponse.json(
            { error: "Failed to submit teacher feedback", message: err.message },
            { status: 500 }
        );
    }
}
