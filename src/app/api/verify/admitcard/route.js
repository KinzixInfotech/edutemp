import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCache, setCache, generateKey } from '@/lib/cache';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');
        const examId = searchParams.get('examId');

        if (!studentId || !examId) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        // Create cache key
        const cacheKey = generateKey('verify:admitcard', { studentId, examId });

        // Try to get from cache
        const cached = await getCache(cacheKey);
        if (cached) {
            return NextResponse.json(cached);
        }

        // Fetch student details with school info
        const student = await prisma.student.findUnique({
            where: { userId: studentId },
            include: {
                user: {
                    select: {
                        name: true,
                    },
                },
                class: {
                    select: {
                        className: true,
                        sections: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        school: {
                            select: {
                                name: true,
                                location: true,
                            },
                        },
                    },
                },
            },
        });

        if (!student) {
            return NextResponse.json(
                { error: 'Student not found' },
                { status: 404 }
            );
        }

        // Fetch exam details
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            select: {
                id: true,
                title: true,
                startDate: true,
                endDate: true,
                type: true,
            },
        });

        if (!exam) {
            return NextResponse.json(
                { error: 'Exam not found' },
                { status: 404 }
            );
        }

        // Get student's section
        const studentSection = student.class?.sections?.find(
            (s) => s.id === student.sectionId
        );

        const result = {
            verified: true,
            student: {
                name: student.user?.name || student.name,
                rollNumber: student.rollNumber,
                className: student.class?.className,
                sectionName: studentSection?.name || student.section?.name,
            },
            exam: {
                title: exam.title,
                startDate: exam.startDate,
                endDate: exam.endDate,
                type: exam.type,
            },
            school: {
                name: student.class?.school?.name,
                location: student.class?.school?.location,
            },
        };

        // Cache for 1 hour
        await setCache(cacheKey, result, 3600);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json(
            { error: 'Verification failed' },
            { status: 500 }
        );
    }
}
