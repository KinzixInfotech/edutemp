import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey, invalidatePattern } from "@/lib/cache";
import { getPagination, paginate } from "@/lib/api-utils";

// GET /api/schools/[schoolId]/examination/exams
export async function GET(req, props) {
  const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);
        const academicYearId = searchParams.get('academicYearId');
        const status = searchParams.get('status');
        const { page, limit } = getPagination(req);

        const cacheKey = generateKey('examination:exams', { schoolId, academicYearId, status, page, limit });

        const result = await remember(cacheKey, async () => {
            const where = {
                schoolId,
                ...(academicYearId && { academicYearId }),
                ...(status && { status }),
            };

            return await paginate(prisma.exam, {
                where,
                include: {
                    academicYear: true,
                    classes: {
                        select: {
                            id: true,
                            className: true,
                        },
                    },
                    subjects: {
                        include: {
                            subject: {
                                select: {
                                    id: true,
                                    subjectName: true,
                                    subjectCode: true,
                                }
                            }
                        },
                        orderBy: {
                            date: 'asc'
                        }
                    },
                    _count: {
                        select: {
                            subjects: true,
                            results: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            }, page, limit);
        }, 300);

        // Return data array for backward compatibility
        return NextResponse.json(result.data);
    } catch (error) {
        console.error('Error fetching exams:', error);
        return NextResponse.json(
            { error: 'Failed to fetch exams' },
            { status: 500 }
        );
    }
}

// POST /api/schools/[schoolId]/examination/exams
export async function POST(req, props) {
  const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await req.json();
        console.log("Create Exam Body:", body);
        const { title, type, startDate, endDate, academicYearId, classIds } = body;
        console.log("Class IDs:", classIds);

        if (!title || !academicYearId) {
            return NextResponse.json(
                { error: 'Title and Academic Year are required' },
                { status: 400 }
            );
        }

        const exam = await prisma.exam.create({
            data: {
                schoolId,
                title,
                academicYearId,
                type: type || 'OFFLINE',
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                status: 'DRAFT',
                classes: {
                    connect: classIds?.map((id) => ({ id: parseInt(id) })) || [],
                },
                securitySettings: body.securitySettings || undefined,
            },
        });

        await invalidatePattern(`examination:*${schoolId}*`);

        return NextResponse.json(exam);
    } catch (error) {
        console.error('Error creating exam:', error);
        return NextResponse.json(
            { error: 'Failed to create exam', details: error.message },
            { status: 500 }
        );
    }
}
