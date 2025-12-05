// Admin API: Manage School Facilities
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;

        const profile = await prisma.schoolPublicProfile.findUnique({
            where: { schoolId },
            select: { id: true }
        });

        if (!profile) {
            return NextResponse.json({ facilities: [] });
        }

        const facilities = await prisma.schoolFacility.findMany({
            where: { profileId: profile.id },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({ facilities });

    } catch (error) {
        console.error('[FACILITIES API ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch facilities' }, { status: 500 });
    }
}

export async function POST(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;
        const body = await req.json();

        const profile = await prisma.schoolPublicProfile.findUnique({
            where: { schoolId },
            select: { id: true }
        });

        if (!profile) {
            return NextResponse.json({ error: 'Public profile not found' }, { status: 404 });
        }

        const facility = await prisma.schoolFacility.create({
            data: {
                profileId: profile.id,
                name: body.name
            }
        });

        return NextResponse.json(facility);

    } catch (error) {
        console.error('[CREATE FACILITY ERROR]', error);
        return NextResponse.json({ error: 'Failed to create facility' }, { status: 500 });
    }
}

export async function DELETE(req, props) {
    try {
        const { searchParams } = new URL(req.url);
        const facilityId = searchParams.get('id');

        await prisma.schoolFacility.delete({
            where: { id: facilityId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[DELETE FACILITY ERROR]', error);
        return NextResponse.json({ error: 'Failed to delete facility' }, { status: 500 });
    }
}
