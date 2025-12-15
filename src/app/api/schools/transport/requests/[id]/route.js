// app/api/schools/transport/requests/[id]/route.js
// Process bus request (approve/reject)

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from '@/lib/cache';

export async function GET(req, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const request = await prisma.busRequest.findUnique({
            where: { id },
            include: {
                student: {
                    select: {
                        userId: true,
                        name: true,
                        admissionNo: true,
                        class: { select: { className: true } },
                        section: { select: { name: true } },
                    }
                },
                parent: { select: { id: true, name: true, contactNumber: true, email: true } },
                route: { select: { id: true, name: true, busStops: { orderBy: { orderIndex: 'asc' } } } },
            },
        });

        if (!request) {
            return NextResponse.json({ error: 'Bus request not found' }, { status: 404 });
        }

        return NextResponse.json({ request });
    } catch (error) {
        console.error('Error fetching bus request:', error);
        return NextResponse.json({ error: 'Failed to fetch bus request' }, { status: 500 });
    }
}

export async function PUT(req, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const data = await req.json();
        const { status, adminNotes, processedById, routeId, stopId, transportFeeId } = data;

        const existingRequest = await prisma.busRequest.findUnique({ where: { id } });
        if (!existingRequest) {
            return NextResponse.json({ error: 'Bus request not found' }, { status: 404 });
        }

        if (!['PENDING', 'APPROVED', 'REJECTED', 'IN_REVIEW'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const request = await prisma.$transaction(async (tx) => {
            // Update request
            const updated = await tx.busRequest.update({
                where: { id },
                data: {
                    status,
                    adminNotes,
                    processedById,
                    processedAt: ['APPROVED', 'REJECTED'].includes(status) ? new Date() : null,
                    ...(routeId && { routeId }),
                    ...(stopId && { stopId }),
                },
                include: {
                    student: { select: { userId: true, name: true, schoolId: true } },
                    route: { select: { name: true } },
                },
            });

            // If approved, create student stop assignment
            if (status === 'APPROVED' && (routeId || existingRequest.routeId) && (stopId || existingRequest.stopId)) {
                const finalRouteId = routeId || existingRequest.routeId;
                const finalStopId = stopId || existingRequest.stopId;

                if (existingRequest.requestType === 'NEW' || existingRequest.requestType === 'CHANGE_STOP') {
                    await tx.studentStopAssignment.upsert({
                        where: { studentId_routeId: { studentId: existingRequest.studentId, routeId: finalRouteId } },
                        update: { stopId: finalStopId, isActive: true },
                        create: {
                            studentId: existingRequest.studentId,
                            routeId: finalRouteId,
                            stopId: finalStopId,
                        },
                    });

                    // Also create route assignment if it doesn't exist
                    const existingRouteAssignment = await tx.studentRouteAssignment.findFirst({
                        where: { studentId: existingRequest.studentId, routeId: finalRouteId },
                    });

                    if (!existingRouteAssignment) {
                        await tx.studentRouteAssignment.create({
                            data: {
                                studentId: existingRequest.studentId,
                                routeId: finalRouteId,
                                schoolId: existingRequest.schoolId,
                            },
                        });
                    }

                    // Assign transport fee if provided
                    if (transportFeeId) {
                        // Check if student already has this fee assigned
                        const existingFee = await tx.studentTransportFee.findFirst({
                            where: {
                                studentId: existingRequest.studentId,
                                transportFeeId: transportFeeId,
                                isActive: true,
                            },
                        });

                        if (!existingFee) {
                            // Get the transport fee details
                            const transportFee = await tx.transportFee.findUnique({
                                where: { id: transportFeeId },
                            });

                            if (transportFee) {
                                await tx.studentTransportFee.create({
                                    data: {
                                        studentId: existingRequest.studentId,
                                        transportFeeId: transportFeeId,
                                        schoolId: existingRequest.schoolId,
                                        amount: transportFee.amount,
                                        startDate: new Date(),
                                        isActive: true,
                                    },
                                });
                            }
                        }
                    }
                } else if (existingRequest.requestType === 'CANCEL') {
                    await tx.studentStopAssignment.updateMany({
                        where: { studentId: existingRequest.studentId },
                        data: { isActive: false },
                    });
                    // Deactivate transport fees when cancelling
                    await tx.studentTransportFee.updateMany({
                        where: { studentId: existingRequest.studentId, isActive: true },
                        data: { isActive: false, endDate: new Date() },
                    });
                }
            }

            return updated;
        });

        await invalidatePattern(`bus-requests:*schoolId:${existingRequest.schoolId}*`);
        await invalidatePattern(`transport-fees:*schoolId:${existingRequest.schoolId}*`);

        return NextResponse.json({ success: true, request });
    } catch (error) {
        console.error('Error processing bus request:', error);
        return NextResponse.json({ error: 'Failed to process bus request' }, { status: 500 });
    }
}

