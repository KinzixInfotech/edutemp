// app/api/schools/[schoolId]/attendance/delegations/acknowledge/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST - Mark delegation as acknowledged by substitute teacher
export async function POST(req, props) {
  const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json();
        const { teacherId, delegationId } = body;

        if (!teacherId || !delegationId) {
            return NextResponse.json({
                error: 'teacherId and delegationId are required'
            }, { status: 400 });
        }

        // Verify the delegation exists and belongs to this teacher
        const delegation = await prisma.attendanceDelegation.findFirst({
            where: {
                id: delegationId,
                schoolId,
                substituteTeacherId: teacherId,
                status: 'ACTIVE'
            }
        });

        if (!delegation) {
            return NextResponse.json({
                error: 'Delegation not found or not authorized'
            }, { status: 404 });
        }

        // Only update if not already acknowledged
        if (!delegation.acknowledgedAt) {
            await prisma.attendanceDelegation.update({
                where: { id: delegationId },
                data: { acknowledgedAt: new Date() }
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Delegation acknowledged',
            acknowledgedAt: delegation.acknowledgedAt || new Date()
        });

    } catch (error) {
        console.error('Acknowledge delegation error:', error);
        return NextResponse.json({
            error: 'Failed to acknowledge delegation',
            details: error.message
        }, { status: 500 });
    }
}