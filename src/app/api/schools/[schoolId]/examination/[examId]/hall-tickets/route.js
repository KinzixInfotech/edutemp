// app/api/schools/[schoolId]/examination/[examId]/hall-tickets/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, delCache, generateKey, invalidatePattern } from '@/lib/cache';

// GET - List all students with eligibility status for an exam
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, examId } = params;

    try {
        const cacheKey = generateKey('hall-tickets', { schoolId, examId });

        const result = await remember(cacheKey, async () => {
            // Get the exam details
            const exam = await prisma.exam.findUnique({
                where: { id: examId },
                include: {
                    classes: { select: { id: true, className: true } }
                }
            });

            if (!exam) {
                return { error: 'Exam not found' };
            }

            // Get all students from the exam's classes
            const classIds = exam.classes.map(c => c.id);

            const students = await prisma.student.findMany({
                where: {
                    schoolId,
                    classId: { in: classIds }
                },
                include: {
                    user: { select: { id: true, name: true, email: true, profilePicture: true } },
                    class: { select: { id: true, className: true } },
                    section: { select: { id: true, name: true } },
                    studentFees: {
                        where: { academicYearId: exam.academicYearId },
                        select: { balanceAmount: true, paidAmount: true, finalAmount: true }
                    }
                }
            });

            // Get existing hall tickets for this exam (using existing fields only)
            const existingTickets = await prisma.admitCard.findMany({
                where: { examId, schoolId },
                select: {
                    id: true,
                    studentId: true,
                    seatNumber: true,
                    showToParent: true
                }
            });

            // Create a simple map - ticket exists = issued
            const ticketMap = new Map(existingTickets.map(t => [t.studentId, {
                status: 'ISSUED',
                isEligible: true,
                manualBlock: false,
                isOverride: false,
                isPublished: t.showToParent
            }]));

            // Get attendance stats for all students
            const attendanceStats = await prisma.attendanceStats.findMany({
                where: {
                    schoolId,
                    userId: { in: students.map(s => s.userId) }
                },
                select: { userId: true, attendancePercentage: true }
            });

            const attendanceMap = new Map(attendanceStats.map(a => [a.userId, a.attendancePercentage]));

            // Build the result
            const studentsWithEligibility = students.map(student => {
                const ticket = ticketMap.get(student.userId);
                const feeBalance = student.studentFees?.reduce((sum, f) => sum + (f.balanceAmount || 0), 0) || 0;
                const feeCleared = feeBalance <= 0;
                const attendancePercent = attendanceMap.get(student.userId) || 0;
                const attendanceOk = attendancePercent >= 75;

                return {
                    studentId: student.userId,
                    name: student.user.name,
                    email: student.user.email,
                    profilePicture: student.user.profilePicture,
                    rollNumber: student.rollNumber,
                    admissionNo: student.admissionNo,
                    className: student.class?.className,
                    sectionName: student.section?.name,
                    // Eligibility data
                    feeCleared,
                    feeDue: Math.max(0, feeBalance),
                    attendancePercent: Math.round(attendancePercent * 10) / 10,
                    attendanceOk,
                    // Ticket status
                    status: ticket?.status || 'NOT_ISSUED',
                    manualBlock: ticket?.manualBlock || false,
                    blockReason: ticket?.blockReason,
                    isOverride: ticket?.isOverride || false,
                    overrideReason: ticket?.overrideReason,
                    isPublished: ticket?.isPublished || false,
                    // Computed eligibility
                    isEligible: feeCleared && attendanceOk && !ticket?.manualBlock
                };
            });

            return {
                exam: {
                    id: exam.id,
                    title: exam.title,
                    startDate: exam.startDate,
                    endDate: exam.endDate,
                    status: exam.status,
                    isPublished: existingTickets.some(t => t.isPublished)
                },
                students: studentsWithEligibility,
                summary: {
                    total: studentsWithEligibility.length,
                    eligible: studentsWithEligibility.filter(s => s.isEligible).length,
                    issued: studentsWithEligibility.filter(s => s.status === 'ISSUED' || s.status === 'PUBLISHED').length,
                    blocked: studentsWithEligibility.filter(s => s.status === 'BLOCKED' || s.manualBlock).length,
                    feeDefaulters: studentsWithEligibility.filter(s => !s.feeCleared).length,
                    attendanceDefaulters: studentsWithEligibility.filter(s => !s.attendanceOk).length
                }
            };
        }, 180); // Cache for 3 minutes

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Hall tickets list error:', error);
        return NextResponse.json({ error: 'Failed to fetch hall tickets' }, { status: 500 });
    }
}

// POST - Issue hall tickets (bulk)
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId, examId } = params;

    try {
        const body = await req.json();
        const { studentIds, userId, action } = body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json({ error: 'studentIds array is required' }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const results = { issued: 0, failed: 0, errors: [] };

        for (const studentId of studentIds) {
            try {
                await prisma.admitCard.upsert({
                    where: { studentId_examId: { studentId, examId } },
                    create: {
                        studentId,
                        examId,
                        schoolId,
                        status: action === 'BLOCK' ? 'BLOCKED' : 'ISSUED',
                        isEligible: action !== 'BLOCK',
                        issueDate: new Date()
                    },
                    update: {
                        status: action === 'BLOCK' ? 'BLOCKED' : 'ISSUED',
                        isEligible: action !== 'BLOCK'
                    }
                });
                results.issued++;
            } catch (err) {
                results.failed++;
                results.errors.push({ studentId, error: err.message });
            }
        }

        // Invalidate cache
        await invalidatePattern(`hall-tickets:${schoolId}:*`);

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'CREATE',
                tableName: 'AdmitCard',
                rowId: examId,
                newData: { action: action || 'ISSUE', count: results.issued }
            }
        });

        return NextResponse.json({
            success: true,
            message: `${results.issued} hall ticket(s) ${action === 'BLOCK' ? 'blocked' : 'issued'}`,
            results
        });
    } catch (error) {
        console.error('Hall ticket issue error:', error);
        return NextResponse.json({ error: 'Failed to issue hall tickets' }, { status: 500 });
    }
}
