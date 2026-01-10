// app/api/schools/[schoolId]/examination/[examId]/hall-tickets/[studentId]/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from '@/lib/cache';

// PATCH - Update individual student hall ticket (block/override)
export async function PATCH(req, props) {
    const params = await props.params;
    const { schoolId, examId, studentId } = params;

    try {
        const body = await req.json();
        const { action, reason, userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        if (!['BLOCK', 'UNBLOCK', 'OVERRIDE', 'REMOVE_OVERRIDE'].includes(action)) {
            return NextResponse.json({
                error: 'action must be BLOCK, UNBLOCK, OVERRIDE, or REMOVE_OVERRIDE'
            }, { status: 400 });
        }

        if ((action === 'BLOCK' || action === 'OVERRIDE') && (!reason || reason.length < 5)) {
            return NextResponse.json({
                error: 'Reason is required for block/override (min 5 chars)'
            }, { status: 400 });
        }

        // Find or create the hall ticket record
        let ticket = await prisma.admitCard.findUnique({
            where: { studentId_examId: { studentId, examId } }
        });

        let updateData = {};

        switch (action) {
            case 'BLOCK':
                updateData = {
                    status: 'BLOCKED',
                    manualBlock: true,
                    blockReason: reason,
                    isEligible: false
                };
                break;
            case 'UNBLOCK':
                updateData = {
                    status: 'NOT_ISSUED',
                    manualBlock: false,
                    blockReason: null
                };
                break;
            case 'OVERRIDE':
                updateData = {
                    status: 'ISSUED',
                    isOverride: true,
                    overrideReason: reason,
                    overrideBy: userId,
                    overrideAt: new Date(),
                    isEligible: true
                };
                break;
            case 'REMOVE_OVERRIDE':
                updateData = {
                    isOverride: false,
                    overrideReason: null,
                    overrideBy: null,
                    overrideAt: null
                };
                break;
        }

        if (ticket) {
            ticket = await prisma.admitCard.update({
                where: { id: ticket.id },
                data: updateData
            });
        } else {
            ticket = await prisma.admitCard.create({
                data: {
                    studentId,
                    examId,
                    schoolId,
                    ...updateData,
                    issueDate: new Date()
                }
            });
        }

        // Invalidate cache
        await invalidatePattern(`hall-tickets:${schoolId}:*`);

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'UPDATE',
                tableName: 'AdmitCard',
                rowId: ticket.id,
                newData: { action, studentId, reason }
            }
        });

        return NextResponse.json({
            success: true,
            message: `Hall ticket ${action.toLowerCase()}ed successfully`,
            ticket: {
                status: ticket.status,
                manualBlock: ticket.manualBlock,
                isOverride: ticket.isOverride
            }
        });
    } catch (error) {
        console.error('Hall ticket update error:', error);
        return NextResponse.json({ error: 'Failed to update hall ticket' }, { status: 500 });
    }
}
