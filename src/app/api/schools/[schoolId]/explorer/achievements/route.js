// Admin API: Manage School Achievements
// Auth required - ADMIN only

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;

        // Get public profile
        const profile = await prisma.schoolPublicProfile.findUnique({
            where: { schoolId },
            select: { id: true }
        });

        if (!profile) {
            return NextResponse.json({ achievements: [] });
        }

        const achievements = await prisma.schoolAchievement.findMany({
            where: { profileId: profile.id },
            orderBy: { year: 'desc' }
        });

        return NextResponse.json({ achievements });

    } catch (error) {
        console.error('[ACHIEVEMENTS API ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
    }
}

export async function POST(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;
        const body = await req.json();

        // Get public profile
        const profile = await prisma.schoolPublicProfile.findUnique({
            where: { schoolId },
            select: { id: true }
        });

        if (!profile) {
            return NextResponse.json({ error: 'Public profile not found' }, { status: 404 });
        }

        const achievement = await prisma.schoolAchievement.create({
            data: {
                profileId: profile.id,
                ...body
            }
        });

        return NextResponse.json(achievement);

    } catch (error) {
        console.error('[CREATE ACHIEVEMENT ERROR]', error);
        return NextResponse.json({ error: 'Failed to create achievement' }, { status: 500 });
    }
}

export async function DELETE(req, props) {
    try {
        const params = await props.params;
        const { searchParams } = new URL(req.url);
        const achievementId = searchParams.get('id');

        await prisma.schoolAchievement.delete({
            where: { id: achievementId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[DELETE ACHIEVEMENT ERROR]', error);
        return NextResponse.json({ error: 'Failed to delete achievement' }, { status: 500 });
    }
}
