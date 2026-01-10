import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';

// GET - Validate teacher session and get teacher data
export async function GET(req) {
    try {
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'No token provided' }, { status: 401 });
        }

        // Get session from Redis
        const sessionStr = await redis.get(`teacher:session:${token}`);

        if (!sessionStr) {
            return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
        }

        const session = typeof sessionStr === 'string' ? JSON.parse(sessionStr) : sessionStr;

        // Check expiration
        if (new Date(session.expiresAt) < new Date()) {
            await redis.del(`teacher:session:${token}`);
            return NextResponse.json({ error: 'Session expired' }, { status: 401 });
        }

        // Get teacher data
        const teacher = await prisma.teachingStaff.findUnique({
            where: { userId: session.teacherId },
            select: {
                userId: true,
                name: true,
                email: true,
                employeeId: true,
                designation: true,
                user: { select: { profilePicture: true } },
                department: { select: { name: true } },
                school: {
                    select: { id: true, name: true, profilePicture: true }
                },
                subjects: {
                    select: { id: true, subjectName: true }
                }
            }
        });

        if (!teacher) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        // Get academic year
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId: session.schoolId, isActive: true },
            select: { id: true, name: true }
        });

        return NextResponse.json({
            valid: true,
            teacher: {
                ...teacher,
                profilePicture: teacher.user?.profilePicture,
                department: teacher.department?.name
            },
            school: teacher.school,
            academicYear,
            session: {
                expiresAt: session.expiresAt
            }
        });

    } catch (error) {
        console.error('[TEACHER SESSION ERROR]', error);
        return NextResponse.json({ error: 'Session validation failed' }, { status: 500 });
    }
}

// DELETE - Logout / destroy session
export async function DELETE(req) {
    try {
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (token) {
            await redis.del(`teacher:session:${token}`);
        }

        return NextResponse.json({ success: true, message: 'Logged out' });
    } catch (error) {
        console.error('[TEACHER LOGOUT ERROR]', error);
        return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
    }
}
