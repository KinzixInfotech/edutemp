import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST - Convert student(s) to alumni
export async function POST(req, props) {
  const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json();
        const { studentIds, leavingReason, leavingDate, graduationYear, notes } = body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json(
                { error: 'Student IDs are required' },
                { status: 400 }
            );
        }

        if (!leavingReason || !leavingDate || !graduationYear) {
            return NextResponse.json(
                { error: 'Leaving reason, date, and graduation year are required' },
                { status: 400 }
            );
        }

        const results = [];
        const errors = [];

        for (const studentId of studentIds) {
            try {
                // Fetch student details
                const student = await prisma.student.findUnique({
                    where: { userId: studentId },
                    include: {
                        class: true,
                        section: true
                    }
                });

                if (!student) {
                    errors.push({ studentId, error: 'Student not found' });
                    continue;
                }

                if (student.isAlumni) {
                    errors.push({ studentId, error: 'Student is already alumni' });
                    continue;
                }

                // Create alumni record
                const alumni = await prisma.alumni.create({
                    data: {
                        schoolId,
                        originalStudentId: studentId,
                        admissionNo: student.admissionNo,
                        name: student.name,
                        email: student.email,
                        contactNumber: student.contactNumber,
                        lastClassId: student.classId,
                        lastSectionId: student.sectionId,
                        lastAcademicYear: student.academicYearId,
                        graduationYear,
                        leavingDate: new Date(leavingDate),
                        leavingReason,
                        currentAddress: student.Address,
                        currentCity: student.city,
                        currentState: student.state,
                        currentCountry: student.country,
                        currentEmail: student.email,
                        currentPhone: student.contactNumber,
                    }
                });

                // Update student record
                await prisma.student.update({
                    where: { userId: studentId },
                    data: {
                        isAlumni: true,
                        alumniConvertedAt: new Date(),
                        DateOfLeaving: leavingDate
                    }
                });

                results.push({ studentId, alumniId: alumni.id, success: true });
            } catch (error) {
                console.error(`Error converting student ${studentId}:`, error);
                errors.push({ studentId, error: error.message });
            }
        }

        return NextResponse.json({
            success: true,
            converted: results.length,
            failed: errors.length,
            results,
            errors
        });

    } catch (error) {
        console.error('Error converting students to alumni:', error);
        return NextResponse.json(
            { error: 'Failed to convert students', details: error.message },
            { status: 500 }
        );
    }
}

// GET - Fetch alumni with filters
export async function GET(req, props) {
  const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const graduationYear = searchParams.get('graduationYear');
    const leavingReason = searchParams.get('leavingReason');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        const where = {
            schoolId,
            ...(graduationYear && { graduationYear: parseInt(graduationYear) }),
            ...(leavingReason && { leavingReason }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { admissionNo: { contains: search, mode: 'insensitive' } }
                ]
            })
        };

        const [alumni, total] = await Promise.all([
            prisma.alumni.findMany({
                where,
                include: {
                    lastClass: {
                        select: {
                            className: true
                        }
                    },
                    lastSection: {
                        select: {
                            name: true
                        }
                    }
                },
                orderBy: {
                    graduationYear: 'desc'
                },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.alumni.count({ where })
        ]);

        return NextResponse.json({
            success: true,
            alumni,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching alumni:', error);
        return NextResponse.json(
            { error: 'Failed to fetch alumni', details: error.message },
            { status: 500 }
        );
    }
}
