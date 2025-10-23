
// app/api/schools/reports/route.js
// Handles reporting for transport usage, maintenance, and attendance
// GET: Generate reports based on type
// Query params: schoolId (required), type (usage, maintenance, attendance), startDate, endDate
// Response: { report: {...} }

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')) : null;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')) : null;

    if (!schoolId || !type) {
        return NextResponse.json({ error: 'schoolId and type are required' }, { status: 400 });
    }

    try {
        let report;
        if (type === 'usage') {
            const assignments = await prisma.studentRouteAssignment.findMany({
                where: {
                    schoolId,
                    assignedAt: { gte: startDate, lte: endDate },
                },
                select: {
                    route: { select: { name: true, vehicle: { select: { licensePlate: true } } } },
                    student: { select: { name: true } },
                    assignedAt: true,
                },
            });
            report = {
                type: 'usage',
                data: assignments.reduce((acc, curr) => {
                    const routeName = curr.route.name;
                    acc[routeName] = acc[routeName] || { count: 0, vehicle: curr.route.vehicle?.licensePlate };
                    acc[routeName].count += 1;
                    return acc;
                }, {}),
            };
        } else if (type === 'maintenance') {
            report = {
                type: 'maintenance',
                data: await prisma.vehicle.findMany({
                    where: {
                        schoolId,
                        maintenanceDue: { lte: endDate || new Date() },
                    },
                    select: {
                        licensePlate: true,
                        model: true,
                        maintenanceDue: true,
                        status: true,
                    },
                }),
            };
        } else if (type === 'attendance') {
            report = {
                type: 'attendance',
                data: await prisma.attendance.findMany({
                    where: {
                        user: { schoolId },
                        date: { gte: startDate, lte: endDate },
                    },
                    select: {
                        user: { select: { name: true } },
                        date: true,
                        status: true,
                    },
                }),
            };
        } else {
            return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
        }

        return NextResponse.json({ report }, {
            headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate' },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }
}
