import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs'; // Assuming bcryptjs is used for password hashing

// POST /api/exam/auth
// Body: { examId, email, password }
export async function POST(req) {
    try {
        const body = await req.json();
        const { examId, email, password } = body;

        if (!examId || !email || !password) {
            return NextResponse.json(
                { error: 'Exam ID, Email, and Password are required' },
                { status: 400 }
            );
        }

        // 1. Find Student by Email (User model)
        // Assuming Student is linked to User via userId
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                student: {
                    include: {
                        class: true
                    }
                },
                role: true
            }
        });

        if (!user || !user.student || user.role?.name !== 'STUDENT') {
            return NextResponse.json(
                { error: 'Invalid credentials or not a student account' },
                { status: 401 }
            );
        }

        // 2. Verify Password (plain text comparison)
        if (user.password !== password) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // 3. Check Exam Eligibility
        const exam = await prisma.exam.findUnique({
            where: { id: parseInt(examId) },
            include: {
                classes: true,
                seatAllocations: {
                    where: { studentId: user.id },
                    include: { hall: true }
                }
            }
        });

        if (!exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        // Check if student's class is assigned to this exam
        const isClassAssigned = exam.classes.some(cls => cls.id === user.student.classId);

        if (!isClassAssigned) {
            return NextResponse.json(
                { error: 'You are not eligible for this exam (Class mismatch)' },
                { status: 403 }
            );
        }

        // 4. Check Fees (if enabled in security settings)
        const securitySettings = exam.securitySettings || {};
        if (securitySettings.blockUnpaidFees) {
            // Check if student has unpaid fees
            const unpaidFees = await prisma.payment.count({
                where: {
                    studentId: user.id,
                    paymentStatus: { in: ['PENDING', 'OVERDUE', 'FAILED'] }
                }
            });

            if (unpaidFees > 0) {
                return NextResponse.json({
                    success: false,
                    status: 'FEES_PENDING',
                    student: {
                        id: user.id,
                        name: user.name,
                        class: user.student.class.className
                    },
                    message: 'Your fees are pending. Please clear your dues before taking the exam.'
                }, { status: 403 });
            }
        }

        // 5. Check Hall Allocation (only for OFFLINE exams)
        if (exam.type === 'OFFLINE') {
            const allocation = exam.seatAllocations[0];

            if (!allocation) {
                return NextResponse.json({
                    success: false,
                    status: 'NOT_ASSIGNED',
                    student: {
                        id: user.id,
                        name: user.name,
                        class: user.student.class.className
                    },
                    message: 'You have not been assigned to any exam hall. Please contact your teacher or admin.'
                });
            }

            // Return with hall info for offline exams
            return NextResponse.json({
                success: true,
                status: 'AUTHORIZED',
                student: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                },
                hall: {
                    name: allocation.hall.name,
                    roomNumber: allocation.hall.roomNumber,
                    seatNumber: allocation.seatNumber
                },
                exam: {
                    title: exam.title,
                    startTime: exam.startDate,
                    duration: 60,
                    schoolId: exam.schoolId
                }
            });
        }

        // 6. Success for ONLINE exams (no hall required)
        return NextResponse.json({
            success: true,
            status: 'AUTHORIZED',
            student: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            hall: null, // No hall for online exams
            exam: {
                title: exam.title,
                startTime: exam.startDate,
                duration: 60,
                schoolId: exam.schoolId
            }
        });

    } catch (error) {
        console.error('Exam Auth Error:', error);
        return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        );
    }
}
