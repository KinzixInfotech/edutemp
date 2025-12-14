// app/api/schools/transport/fees/route.js
// Transport Fee Structure management
// GET: List transport fee structures
// POST: Create new fee structure

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateKey, remember, invalidatePattern } from '@/lib/cache';

const CACHE_TTL = 300; // 5 minutes

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const routeId = searchParams.get('routeId');
    const academicYearId = searchParams.get('academicYearId');
    const isActive = searchParams.get('isActive');

    if (!schoolId) {
        return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    try {
        const cacheKey = generateKey('transport-fees', { schoolId, routeId, academicYearId, isActive });

        const data = await remember(cacheKey, async () => {
            const where = {
                schoolId,
                ...(routeId && { routeId }),
                ...(academicYearId && { academicYearId }),
                ...(isActive !== null && isActive !== undefined && { isActive: isActive === 'true' }),
            };

            const fees = await prisma.transportFee.findMany({
                where,
                include: {
                    route: { select: { id: true, name: true } },
                    academicYear: { select: { id: true, name: true } },
                    _count: { select: { studentFees: { where: { isActive: true } } } },
                },
                orderBy: { createdAt: 'desc' },
            });

            return { fees, total: fees.length };
        }, CACHE_TTL);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching transport fees:', error);
        return NextResponse.json({ error: 'Failed to fetch transport fees' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const data = await req.json();
        const { schoolId, routeId, name, amount, frequency, academicYearId, description } = data;

        if (!schoolId || !name || amount === undefined || !frequency) {
            return NextResponse.json({
                error: 'Missing required fields: schoolId, name, amount, frequency'
            }, { status: 400 });
        }

        if (!['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'].includes(frequency)) {
            return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
        }

        const fee = await prisma.transportFee.create({
            data: {
                schoolId,
                routeId,
                name,
                amount: parseFloat(amount),
                frequency,
                academicYearId,
                description,
            },
            include: {
                route: { select: { id: true, name: true } },
                academicYear: { select: { id: true, name: true } },
            },
        });

        await invalidatePattern(`transport-fees:*schoolId:${schoolId}*`);

        return NextResponse.json({ success: true, fee }, { status: 201 });
    } catch (error) {
        console.error('Error creating transport fee:', error);
        return NextResponse.json({ error: 'Failed to create transport fee' }, { status: 500 });
    }
}
