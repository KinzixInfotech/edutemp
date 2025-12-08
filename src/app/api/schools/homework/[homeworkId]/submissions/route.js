// Homework Submissions API
// GET - Get all submissions with student details for a homework
// PATCH - Update multiple submission statuses

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Get all student submissions for a homework
export async function GET(req, props) {
    const params = await props.params;
    const { homeworkId } = params;

    if (!homeworkId) {
        return NextResponse.json({ error: "homeworkId is required" }, { status: 400 });
    }

    try {
        // Get homework with all submissions and student details
        const homework = await prisma.homework.findUnique({
            where: { id: homeworkId },
            include: {
                class: {
                    select: { id: true, className: true }
                },
                section: {
                    select: { id: true, name: true }
                },
                subject: {
                    select: { id: true, subjectName: true }
                },
                teacher: {
                    select: { userId: true, name: true }
                },
                submissions: {
                    include: {
                        student: {
                            select: {
                                userId: true,
                                name: true,
                                rollNumber: true,
                                gender: true,
                                user: {
                                    select: {
                                        profilePicture: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        student: {
                            rollNumber: 'asc'
                        }
                    }
                }
            }
        });

        if (!homework) {
            return NextResponse.json({ error: "Homework not found" }, { status: 404 });
        }

        // Format submissions with student info
        const submissions = homework.submissions.map(sub => ({
            id: sub.id,
            studentId: sub.studentId,
            studentName: sub.student?.name || 'Unknown',
            rollNumber: sub.student?.rollNumber || '-',
            profilePicture: sub.student?.user?.profilePicture || null,
            gender: sub.student?.gender || null,
            status: sub.status,
            submittedAt: sub.submittedAt,
            fileUrl: sub.fileUrl,
            feedback: sub.feedback,
            grade: sub.grade
        }));

        // Calculate stats
        const stats = {
            total: submissions.length,
            submitted: submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'EVALUATED').length,
            pending: submissions.filter(s => s.status === 'PENDING').length,
            late: submissions.filter(s => s.status === 'LATE').length
        };

        return NextResponse.json({
            success: true,
            homework: {
                id: homework.id,
                title: homework.title,
                description: homework.description,
                dueDate: homework.dueDate,
                assignedDate: homework.assignedDate,
                class: homework.class,
                section: homework.section,
                subject: homework.subject,
                teacher: homework.teacher
            },
            submissions,
            stats
        });
    } catch (error) {
        console.error("Fetch homework submissions error:", error);
        return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
    }
}

// PATCH - Update multiple submission statuses (like attendance marking)
export async function PATCH(req, props) {
    const params = await props.params;
    const { homeworkId } = params;
    const body = await req.json();
    const { submissions } = body; // Array of { submissionId, status, feedback?, grade? }

    if (!homeworkId) {
        return NextResponse.json({ error: "homeworkId is required" }, { status: 400 });
    }

    if (!submissions || !Array.isArray(submissions)) {
        return NextResponse.json({ error: "submissions array is required" }, { status: 400 });
    }

    try {
        // Update all submissions in parallel
        const updatePromises = submissions.map(sub =>
            prisma.homeworkSubmission.update({
                where: { id: sub.submissionId },
                data: {
                    status: sub.status,
                    submittedAt: sub.status === 'SUBMITTED' ? new Date() : null,
                    feedback: sub.feedback || undefined,
                    grade: sub.grade || undefined
                }
            })
        );

        await Promise.all(updatePromises);

        // Get updated stats
        const allSubmissions = await prisma.homeworkSubmission.findMany({
            where: { homeworkId }
        });

        const stats = {
            total: allSubmissions.length,
            submitted: allSubmissions.filter(s => s.status === 'SUBMITTED' || s.status === 'EVALUATED').length,
            pending: allSubmissions.filter(s => s.status === 'PENDING').length,
            late: allSubmissions.filter(s => s.status === 'LATE').length
        };

        return NextResponse.json({
            success: true,
            message: `Updated ${submissions.length} submission(s)`,
            stats
        });
    } catch (error) {
        console.error("Update submissions error:", error);
        return NextResponse.json({ error: "Failed to update submissions" }, { status: 500 });
    }
}
