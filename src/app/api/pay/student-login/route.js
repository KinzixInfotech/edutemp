import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for server-side auth
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST - Student login for fee payment
export async function POST(req) {
    try {
        const body = await req.json();
        const { schoolId, admissionNo, password, academicYearId, turnstileToken } = body;

        if (!schoolId || !admissionNo || !password || !academicYearId) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Verify Turnstile token
        if (!turnstileToken) {
            return NextResponse.json(
                { error: 'Security verification required. Please complete the captcha.' },
                { status: 400 }
            );
        }

        // Server-side Turnstile verification
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
                user: {
                    select: {
                        id: true,
                        email: true,
                    }
                },
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

        // Verify password with Supabase Auth
        if (!student.user?.email) {
            return NextResponse.json(
                { error: 'No login credentials found for this student. Please contact your school.' },
                { status: 400 }
            );
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: student.user.email,
            password,
        });

        if (authError) {
            console.error('[PAY LOGIN] Auth error:', authError.message);
            return NextResponse.json(
                { error: 'Invalid password. Please try again.' },
                { status: 401 }
            );
        }

        // Verify the authenticated user matches the student
        if (authData.user.id !== student.userId) {
            console.error('[PAY LOGIN] User mismatch:', authData.user.id, student.userId);
            return NextResponse.json(
                { error: 'Authentication failed. Please try again.' },
                { status: 401 }
            );
        }

        // Generate a session token for pay portal
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
