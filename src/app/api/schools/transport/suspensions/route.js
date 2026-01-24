// Bus Service Suspension API - Emergency disable for specific dates
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET: Fetch all suspensions for a school
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('schoolId');

        if (!schoolId) {
            return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
        }

        // Get active and future suspensions
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const suspensions = await prisma.busServiceSuspension.findMany({
            where: {
                schoolId,
                endDate: { gte: today } // Only show current and future suspensions
            },
            orderBy: { startDate: 'asc' }
        });

        return NextResponse.json({ success: true, suspensions });
    } catch (error) {
        console.error('Error fetching suspensions:', error);
        return NextResponse.json({ error: 'Failed to fetch suspensions' }, { status: 500 });
    }
}

// POST: Create a new suspension
export async function POST(req) {
    try {
        const data = await req.json();
        const { schoolId, startDate, endDate, reason, createdBy } = data;

        if (!schoolId || !startDate || !endDate || !reason || !createdBy) {
            return NextResponse.json({
                error: 'schoolId, startDate, endDate, reason, and createdBy are required'
            }, { status: 400 });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        if (end < start) {
            return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 });
        }

        const suspension = await prisma.busServiceSuspension.create({
            data: {
                schoolId,
                startDate: start,
                endDate: end,
                reason,
                createdBy
            }
        });

        return NextResponse.json({
            success: true,
            suspension,
            message: `Bus service suspended from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`
        });
    } catch (error) {
        console.error('Error creating suspension:', error);
        return NextResponse.json({ error: 'Failed to create suspension' }, { status: 500 });
    }
}

// DELETE: Remove a suspension
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        await prisma.busServiceSuspension.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Suspension removed' });
    } catch (error) {
        console.error('Error deleting suspension:', error);
        return NextResponse.json({ error: 'Failed to delete suspension' }, { status: 500 });
    }
}
