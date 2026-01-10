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

// POST - Teacher login for teacher portal
export async function POST(req) {
    try {
        const body = await req.json();
        const { schoolId, employeeId, password, turnstileToken } = body;

        // Accept employeeId which can be employee ID or email
        if (!schoolId || !employeeId || !password) {
            return NextResponse.json(
                { error: 'School ID, Employee ID/Email, and password are required' },
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
                    console.error('[TEACHER LOGIN] Turnstile verification failed:', turnstileResult);
                    return NextResponse.json(
                        { error: 'Captcha verification failed. Please try again.' },
                        { status: 400 }
                    );
                }
            } catch (err) {
                console.error('[TEACHER LOGIN] Turnstile verification error:', err);
            }
        }

        const searchValue = employeeId.trim().toLowerCase();

        // Find teacher by employeeId OR email
        const teacher = await prisma.teachingStaff.findFirst({
            where: {
                schoolId,
                OR: [
                    { employeeId: { equals: searchValue, mode: 'insensitive' } },
                    { email: { equals: searchValue, mode: 'insensitive' } },
                ],
            },
            select: {
                userId: true,
                name: true,
                email: true,
                employeeId: true,
                designation: true,
                departmentId: true,
                schoolId: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        profilePicture: true,
                        role: true,
                    }
                },
                department: {
                    select: { name: true }
                },
                school: {
                    select: {
                        id: true,
                        name: true,
                        profilePicture: true,
                        schoolCode: true,
                    }
                },
                // Get assigned subjects for later use
                subjects: {
                    select: { id: true, subjectName: true }
                }
            },
        });

        if (!teacher) {
            return NextResponse.json(
                { error: 'Teacher not found. Please check your Employee ID or email.' },
                { status: 404 }
            );
        }

        // Verify password with Supabase Auth
        if (!teacher.user?.email) {
            return NextResponse.json(
                { error: 'No login credentials found. Please contact your administrator.' },
                { status: 400 }
            );
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: teacher.user.email,
            password,
        });

        if (authError) {
            console.error('[TEACHER LOGIN] Auth error:', authError.message);
            return NextResponse.json(
                { error: 'Invalid password. Please try again.' },
                { status: 401 }
            );
        }

        // Verify the authenticated user matches the teacher
        if (authData.user.id !== teacher.userId) {
            console.error('[TEACHER LOGIN] User mismatch:', authData.user.id, teacher.userId);
            return NextResponse.json(
                { error: 'Authentication failed. Please try again.' },
                { status: 401 }
            );
        }

        // Get active academic year
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
            select: { id: true, name: true }
        });

        // Generate a session token for teacher portal
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

        // Store session in Redis
        const sessionData = {
            teacherId: teacher.userId,
            schoolId: teacher.schoolId,
            academicYearId: academicYear?.id,
            email: teacher.email,
            role: teacher.user?.role || 'TEACHER',
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
        };

        await redis.set(
            `teacher:session:${token}`,
            JSON.stringify(sessionData),
            { ex: 28800 } // 8 hours
        );

        return NextResponse.json({
            success: true,
            token,
            expiresAt: expiresAt.toISOString(),
            teacher: {
                userId: teacher.userId,
                name: teacher.name,
                email: teacher.email,
                employeeId: teacher.employeeId,
                designation: teacher.designation,
                department: teacher.department?.name,
                profilePicture: teacher.user?.profilePicture,
                school: teacher.school,
                subjects: teacher.subjects,
            },
            academicYear,
        });

    } catch (error) {
        console.error('[TEACHER LOGIN ERROR]', error);
        return NextResponse.json(
            { error: 'Login failed. Please try again.' },
            { status: 500 }
        );
    }
}
