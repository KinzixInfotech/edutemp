// app/api/schools/[schoolId]/attendance/delegations/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Helper: Parse IST date
const ISTDate = (input) => {
    if (!input) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    }
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return new Date(`${input}T00:00:00.000Z`);
    }
    const d = new Date(input);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
};

// GET - Fetch delegations with filters
export async function GET(req, props) {
  const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const substituteTeacherId = searchParams.get('substituteTeacherId');
    const originalTeacherId = searchParams.get('originalTeacherId');
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const includeDetails = searchParams.get('includeDetails') === 'true';

    try {
        const where = {
            schoolId,
            ...(substituteTeacherId && { substituteTeacherId }),
            ...(originalTeacherId && { originalTeacherId }),
            ...(status && { status }),
            ...(date && {
                startDate: { lte: ISTDate(date) },
                endDate: { gte: ISTDate(date) }
            })
        };

        const delegations = await prisma.attendanceDelegation.findMany({
            where,
            include: includeDetails ? {
                originalTeacher: {
                    select: {
                        userId: true,
                        name: true,
                        employeeId: true,
                        user: { select: { profilePicture: true } }
                    }
                },
                substituteTeacher: {
                    select: {
                        userId: true,
                        name: true,
                        employeeId: true,
                        user: { select: { profilePicture: true } }
                    }
                },
                class: {
                    select: {
                        id: true,
                        className: true
                    }
                },
                section: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            } : undefined,
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            delegations,
            count: delegations.length
        });
    } catch (error) {
        console.error('Fetch delegations error:', error);
        return NextResponse.json({
            error: 'Failed to fetch delegations',
            details: error.message
        }, { status: 500 });
    }
}

// POST - Create new delegation
export async function POST(req, props) {
  const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();

    const {
        originalTeacherId,
        substituteTeacherId,
        classId,
        sectionId,
        startDate,
        endDate,
        reason,
        createdById
    } = body;

    // Validation
    if (!originalTeacherId || !substituteTeacherId || !classId || !startDate || !endDate || !createdById) {
        return NextResponse.json({
            error: 'Missing required fields',
            required: ['originalTeacherId', 'substituteTeacherId', 'classId', 'startDate', 'endDate', 'createdById']
        }, { status: 400 });
    }

    if (originalTeacherId === substituteTeacherId) {
        return NextResponse.json({
            error: 'Original teacher and substitute teacher cannot be the same'
        }, { status: 400 });
    }

    const start = ISTDate(startDate);
    const end = ISTDate(endDate);

    if (end < start) {
        return NextResponse.json({
            error: 'End date must be after start date'
        }, { status: 400 });
    }

    try {
        // 1. Verify original teacher is on leave
        const teacherLeave = await prisma.leaveRequest.findFirst({
            where: {
                userId: originalTeacherId,
                schoolId,
                status: 'APPROVED',
                startDate: { lte: end },
                endDate: { gte: start }
            }
        });

        if (!teacherLeave) {
            return NextResponse.json({
                error: 'Original teacher must have approved leave for the delegation period',
                message: 'Cannot create delegation without approved leave request'
            }, { status: 400 });
        }

        // 2. Check if substitute is already delegated elsewhere during this period
        // const conflictingDelegation = await prisma.attendanceDelegation.findFirst({
        //     where: {
        //         schoolId,
        //         substituteTeacherId,
        //         status: 'ACTIVE',
        //         OR: [
        //             {
        //                 startDate: { lte: end },
        //                 endDate: { gte: start }
        //             }
        //         ]
        //     },
        //     include: {
        //         class: { select: { className: true } },
        //         section: { select: { name: true } }
        //     }
        // });
        const conflictingDelegation = await prisma.attendanceDelegation.findFirst({
            where: {
                schoolId,
                substituteTeacherId,
                status: 'ACTIVE',
                // date overlap logic
                startDate: { lte: end },
                endDate: { gte: start }
            },
            include: {
                class: { select: { className: true } },
                section: { select: { name: true } }
            }
        });
        if (conflictingDelegation) {
            return NextResponse.json({
                error: 'Substitute teacher already assigned',
                message: `This teacher is already assigned to ${conflictingDelegation.class.className}${conflictingDelegation.section ? ` - ${conflictingDelegation.section.name}` : ''} from ${conflictingDelegation.startDate.toLocaleDateString()} to ${conflictingDelegation.endDate.toLocaleDateString()}`,
                conflictingDelegation
            }, { status: 400 });
        }

        // 3. Create delegation
        const delegation = await prisma.attendanceDelegation.create({
            data: {
                schoolId,
                originalTeacherId,
                substituteTeacherId,
                classId: parseInt(classId),
                sectionId: sectionId ? parseInt(sectionId) : null,
                startDate: start,
                endDate: end,
                reason,
                createdById,
                status: 'ACTIVE'
            },
            include: {
                originalTeacher: {
                    select: {
                        userId: true,
                        name: true,
                        employeeId: true
                    }
                },
                substituteTeacher: {
                    select: {
                        userId: true,
                        name: true,
                        employeeId: true
                    }
                },
                class: { select: { id: true, className: true } },
                section: { select: { id: true, name: true } }
            }
        });

        return NextResponse.json({
            success: true,
            delegation,
            message: 'Delegation created successfully'
        }, { status: 201 });
    } catch (error) {
        console.error('Create delegation error:', error);
        return NextResponse.json({
            error: 'Failed to create delegation',
            details: error.message
        }, { status: 500 });
    }
}

// PATCH - Update delegation (cancel, complete)
export async function PATCH(req, props) {
  const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { delegationId, status, updatedById } = body;

    if (!delegationId || !status) {
        return NextResponse.json({
            error: 'delegationId and status are required'
        }, { status: 400 });
    }

    if (!['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
        return NextResponse.json({
            error: 'Invalid status. Must be ACTIVE, COMPLETED, or CANCELLED'
        }, { status: 400 });
    }

    try {
        const delegation = await prisma.attendanceDelegation.update({
            where: {
                id: delegationId,
                schoolId
            },
            data: {
                status,
                updatedAt: new Date()
            },
            include: {
                originalTeacher: { select: { name: true } },
                substituteTeacher: { select: { name: true } },
                class: { select: { className: true } },
                section: { select: { name: true } }
            }
        });

        return NextResponse.json({
            success: true,
            delegation,
            message: `Delegation ${status.toLowerCase()} successfully`
        });
    } catch (error) {
        console.error('Update delegation error:', error);
        return NextResponse.json({
            error: 'Failed to update delegation',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE - Remove delegation
export async function DELETE(req, props) {
  const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const delegationId = searchParams.get('delegationId');

    if (!delegationId) {
        return NextResponse.json({
            error: 'delegationId is required'
        }, { status: 400 });
    }

    try {
        await prisma.attendanceDelegation.delete({
            where: {
                id: delegationId,
                schoolId
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Delegation deleted successfully'
        });
    } catch (error) {
        console.error('Delete delegation error:', error);
        return NextResponse.json({
            error: 'Failed to delete delegation',
            details: error.message
        }, { status: 500 });
    }
}