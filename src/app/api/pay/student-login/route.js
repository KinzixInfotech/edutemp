import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import crypto from 'crypto';

// POST - Student login for fee payment
export async function POST(req) {
    try {
        const body = await req.json();
        const { schoolId, admissionNo, academicYearId, turnstileToken } = body;

        if (!schoolId || !admissionNo || !academicYearId) {
            return NextResponse.json(
                { error: 'School ID, Admission Number, and Academic Year are required' },
                { status: 400 }
            );
        }

        // Verify Turnstile token (frontend already validated, backend is optional for extra security)
        if (!turnstileToken) {
            return NextResponse.json(
                { error: 'Security verification required. Please complete the captcha.' },
                { status: 400 }
            );
        }

        // Optional: Server-side Turnstile verification if secret key is configured
        if (process.env.TURNSTILE_SECRET_KEY) {
            try {
                const turnstileVerify = await fetch(
                    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            secret: process.env.TURNSTILE_SECRET_KEY,
                            response: turnstileToken,
                        }),
                    }
                );
                const turnstileResult = await turnstileVerify.json();

                if (!turnstileResult.success) {
                    console.error('[PAY LOGIN] Turnstile verification failed:', turnstileResult);
                    return NextResponse.json(
                        { error: 'Captcha verification failed. Please try again.' },
                        { status: 400 }
                    );
                }
            } catch (err) {
                console.error('[PAY LOGIN] Turnstile verification error:', err);
                // Continue without server verification if it fails
            }
        }

        // Find student by admission number and school
        const student = await prisma.student.findFirst({
            where: {
                admissionNo: admissionNo.trim(),
                schoolId,
            },
            select: {
                userId: true,
                name: true,
                admissionNo: true,
                rollNumber: true,
                email: true,
                contactNumber: true,
                FatherName: true,
                MotherName: true,
                classId: true,
                sectionId: true,
                schoolId: true,
                class: {
                    select: { className: true }
                },
                section: {
                    select: { name: true }
                },
                school: {
                    select: {
                        name: true,
                        profilePicture: true,
                        schoolCode: true,
                    }
                }
            },
        });

        if (!student) {
            return NextResponse.json(
                { error: 'Student not found. Please check your admission number.' },
                { status: 404 }
            );
        }

        // Generate a session token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

        // Store session in Redis
        const sessionData = {
            studentId: student.userId,
            schoolId: student.schoolId,
            academicYearId,
            admissionNo: student.admissionNo,
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
        };

        await redis.set(
            `pay:session:${token}`,
            JSON.stringify(sessionData),
            { ex: 7200 } // 2 hours
        );

        return NextResponse.json({
            success: true,
            token,
            expiresAt: expiresAt.toISOString(),
            student: {
                userId: student.userId,
                name: student.name,
                admissionNo: student.admissionNo,
                rollNumber: student.rollNumber,
                class: student.class?.className,
                section: student.section?.name,
                fatherName: student.FatherName,
                motherName: student.MotherName,
                school: student.school,
            },
        });

    } catch (error) {
        console.error('[PAY STUDENT LOGIN ERROR]', error);
        return NextResponse.json(
            { error: 'Login failed. Please try again.' },
            { status: 500 }
        );
    }
}
