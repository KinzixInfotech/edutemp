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
    const academicYearId = searchParams.get('academicYearId');
    const isActive = searchParams.get('isActive');

    try {
        const cacheKey = generateKey('leave:buckets', { schoolId, academicYearId, isActive });

        const buckets = await remember(cacheKey, async () => {
            return prisma.leaveBucket.findMany({
                where: {
                    schoolId,
                    ...(academicYearId && { academicYearId }),
                    ...(isActive !== null && isActive !== undefined && { isActive: isActive === 'true' })
                },
                include: {
                    academicYear: {
                        select: {
                            id: true,
                            name: true,
                            isCurrent: true
                        }
                    }
                },
                orderBy: [
                    { leaveType: 'asc' }
                ]
            });
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

    const {
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

    if (!academicYearId || !leaveType || yearlyLimit === undefined) {
        return NextResponse.json({
            error: 'academicYearId, leaveType, and yearlyLimit are required'
        }, { status: 400 });
    }

    try {
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
                schoolId,
                academicYearId,
                leaveType,
                yearlyLimit,
                monthlyLimit: monthlyLimit || null,
                carryForwardLimit: carryForwardLimit || 0,
                encashmentLimit: encashmentLimit || 0,
                encashmentPerDayRate: encashmentPerDayRate || null,
                applicableToTeaching: applicableToTeaching ?? true,
                applicableToNonTeaching: applicableToNonTeaching ?? true,
                isActive: true
            },
            include: {
                academicYear: {
                    select: { id: true, name: true }
                }
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
                yearlyLimit: updateData.yearlyLimit,
                monthlyLimit: updateData.monthlyLimit,
                carryForwardLimit: updateData.carryForwardLimit,
                encashmentLimit: updateData.encashmentLimit,
                encashmentPerDayRate: updateData.encashmentPerDayRate,
                applicableToTeaching: updateData.applicableToTeaching,
                applicableToNonTeaching: updateData.applicableToNonTeaching,
                isActive: updateData.isActive
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
