// Leave Buckets API
// GET - List all leave buckets
// POST - Create new leave bucket

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

// GET - List all leave buckets for school
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    let academicYearId = searchParams.get('academicYearId');
    const isActive = searchParams.get('isActive');

    try {
        // If no academicYearId provided, get the current one
        if (!academicYearId) {
            const currentYear = await prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
                select: { id: true }
            });
            academicYearId = currentYear?.id;
        }

        const cacheKey = generateKey('leave:buckets', { schoolId, academicYearId, isActive });

        const buckets = await remember(cacheKey, async () => {
            const rawBuckets = await prisma.leaveBucket.findMany({
                where: {
                    schoolId,
                    ...(academicYearId && { academicYearId }),
                },
                orderBy: [
                    { leaveType: 'asc' }
                ]
            });

            // Map schema fields back to what the UI expects for compatibility
            return rawBuckets.map(bucket => ({
                ...bucket,
                carryForwardLimit: bucket.maxCarryForward,
                encashmentLimit: bucket.encashable ? 1 : 0, // Schema lacks encashment limit, so we use a flag
                encashmentPerDayRate: bucket.encashmentRate,
                applicableToTeaching: bucket.applicableTo.includes('TEACHING'),
                applicableToNonTeaching: bucket.applicableTo.includes('NON_TEACHING'),
                isActive: true // Schema lacks isActive, so we default to true
            }));
        }, 600); // Cache for 10 minutes

        return NextResponse.json(buckets);
    } catch (error) {
        console.error('Leave buckets fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch leave buckets',
            details: error.message
        }, { status: 500 });
    }
}

// POST - Create new leave bucket
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const data = await req.json();

    let {
        academicYearId,
        leaveType,
        yearlyLimit,
        monthlyLimit,
        carryForwardLimit,
        encashmentLimit,
        encashmentPerDayRate,
        applicableToTeaching,
        applicableToNonTeaching
    } = data;

    if (!leaveType || yearlyLimit === undefined) {
        return NextResponse.json({
            error: 'leaveType and yearlyLimit are required'
        }, { status: 400 });
    }

    try {
        // Auto-fetch current academic year if not provided
        if (!academicYearId) {
            const currentYear = await prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
                select: { id: true }
            });
            if (!currentYear) {
                return NextResponse.json({
                    error: 'No current academic year found. Please set up an academic year first.'
                }, { status: 400 });
            }
            academicYearId = currentYear.id;
        }

        // Check if bucket already exists for this leave type and academic year
        const existing = await prisma.leaveBucket.findFirst({
            where: {
                schoolId,
                academicYearId,
                leaveType
            }
        });

        if (existing) {
            return NextResponse.json({
                error: `Leave bucket for ${leaveType} already exists for this academic year`
            }, { status: 400 });
        }

        const bucket = await prisma.leaveBucket.create({
            data: {
                school: { connect: { id: schoolId } },
                academicYearId: academicYearId,
                leaveType: leaveType,
                yearlyLimit: parseInt(yearlyLimit) || 0,
                monthlyLimit: parseInt(monthlyLimit) || 0,
                carryForward: (parseInt(carryForwardLimit) || 0) > 0,
                maxCarryForward: parseInt(carryForwardLimit) || 0,
                encashable: (parseInt(encashmentLimit) || 0) > 0,
                encashmentRate: parseFloat(encashmentPerDayRate) || null,
                applicableTo: [
                    ...(applicableToTeaching ? ['TEACHING'] : []),
                    ...(applicableToNonTeaching ? ['NON_TEACHING'] : [])
                ],
                description: data.description || null
            }
        });

        // Invalidate cache
        await invalidatePattern(`leave:buckets:${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: 'Leave bucket created successfully',
            bucket
        });
    } catch (error) {
        console.error('Leave bucket create error:', error);
        return NextResponse.json({
            error: 'Failed to create leave bucket',
            details: error.message
        }, { status: 500 });
    }
}

// PUT - Update leave bucket
export async function PUT(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const data = await req.json();

    const { id, ...updateData } = data;

    if (!id) {
        return NextResponse.json({
            error: 'Bucket id is required'
        }, { status: 400 });
    }

    try {
        const existing = await prisma.leaveBucket.findUnique({
            where: { id }
        });

        if (!existing) {
            return NextResponse.json({
                error: 'Leave bucket not found'
            }, { status: 404 });
        }

        if (existing.schoolId !== schoolId) {
            return NextResponse.json({
                error: 'Unauthorized'
            }, { status: 403 });
        }

        const bucket = await prisma.leaveBucket.update({
            where: { id },
            data: {
                yearlyLimit: parseInt(updateData.yearlyLimit),
                monthlyLimit: parseInt(updateData.monthlyLimit),
                carryForward: (parseInt(updateData.carryForwardLimit) || 0) > 0,
                maxCarryForward: parseInt(updateData.carryForwardLimit),
                encashable: (parseInt(updateData.encashmentLimit) || 0) > 0,
                encashmentRate: parseFloat(updateData.encashmentPerDayRate),
                applicableTo: [
                    ...(updateData.applicableToTeaching ? ['TEACHING'] : []),
                    ...(updateData.applicableToNonTeaching ? ['NON_TEACHING'] : [])
                ],
                description: updateData.description
            }
        });

        // Invalidate cache
        await invalidatePattern(`leave:buckets:${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: 'Leave bucket updated',
            bucket
        });
    } catch (error) {
        console.error('Leave bucket update error:', error);
        return NextResponse.json({
            error: 'Failed to update leave bucket',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE - Delete leave bucket
export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({
            error: 'Bucket id is required'
        }, { status: 400 });
    }

    try {
        const existing = await prisma.leaveBucket.findUnique({
            where: { id }
        });

        if (!existing) {
            return NextResponse.json({
                error: 'Leave bucket not found'
            }, { status: 404 });
        }

        if (existing.schoolId !== schoolId) {
            return NextResponse.json({
                error: 'Unauthorized'
            }, { status: 403 });
        }

        await prisma.leaveBucket.delete({
            where: { id }
        });

        // Invalidate cache
        await invalidatePattern(`leave:buckets:${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: 'Leave bucket deleted'
        });
    } catch (error) {
        console.error('Leave bucket delete error:', error);
        return NextResponse.json({
            error: 'Failed to delete leave bucket',
            details: error.message
        }, { status: 500 });
    }
}
