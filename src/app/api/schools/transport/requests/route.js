// app/api/schools/transport/requests/route.js
// Bus Request management
// GET: List requests (admin) or my requests (parent)
// POST: Create new request (parent)

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateKey, remember, invalidatePattern } from '@/lib/cache';

const CACHE_TTL = 120; // 2 minutes

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const parentId = searchParams.get('parentId');
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');
    const requestType = searchParams.get('requestType');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;

    if (!schoolId && !parentId) {
        return NextResponse.json({ error: 'schoolId or parentId required' }, { status: 400 });
    }

    try {
        const cacheKey = generateKey('bus-requests', { schoolId, parentId, status, page });

        const data = await remember(cacheKey, async () => {
            const where = {
                ...(schoolId && { schoolId }),
                ...(parentId && { parentId }),
                ...(studentId && { studentId }),
                ...(status && { status }),
                ...(requestType && { requestType }),
            };

            const [requests, total] = await Promise.all([
                prisma.busRequest.findMany({
                    where,
                    include: {
                        student: { select: { userId: true, name: true, admissionNo: true, class: { select: { className: true } } } },
                        parent: { select: { id: true, name: true, contactNumber: true } },
                        route: { select: { id: true, name: true } },
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.busRequest.count({ where }),
            ]);

            return { requests, total, page, limit, totalPages: Math.ceil(total / limit) };
        }, CACHE_TTL);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching bus requests:', error);
        return NextResponse.json({ error: 'Failed to fetch bus requests' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const data = await req.json();
        const { studentId, parentId, schoolId, routeId, stopId, requestType, preferredStop, stopLatitude, stopLongitude, reason, notes } = data;

        if (!studentId || !parentId || !schoolId || !requestType) {
            return NextResponse.json({
                error: 'Missing required fields: studentId, parentId, schoolId, requestType'
            }, { status: 400 });
        }

        if (!['NEW', 'CHANGE_STOP', 'CHANGE_ROUTE', 'CANCEL'].includes(requestType)) {
            return NextResponse.json({ error: 'Invalid requestType' }, { status: 400 });
        }

        // Verify parent-student relationship
        const parentLink = await prisma.studentParentLink.findFirst({
            where: { studentId, parent: { id: parentId }, isActive: true },
        });
        if (!parentLink) {
            return NextResponse.json({ error: 'Parent is not linked to this student' }, { status: 403 });
        }

        const request = await prisma.busRequest.create({
            data: {
                studentId,
                parentId,
                schoolId,
                routeId,
                stopId,
                requestType,
                status: 'PENDING',
                preferredStop,
                stopLatitude,
                stopLongitude,
                reason,
                notes,
            },
            include: {
                student: { select: { name: true } },
                route: { select: { name: true } },
            },
        });

        await invalidatePattern(`bus-requests:*schoolId:${schoolId}*`);

        return NextResponse.json({ success: true, request }, { status: 201 });
    } catch (error) {
        console.error('Error creating bus request:', error);
        return NextResponse.json({ error: 'Failed to create bus request' }, { status: 500 });
    }
}
