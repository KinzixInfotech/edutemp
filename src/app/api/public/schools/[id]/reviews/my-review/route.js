// API: Get user's own review for a school
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import supabaseServer from '@/lib/supabase-server'; // Use singleton

export async function GET(req, props) {
    try {
        const params = await props.params;
        const { id: profileId } = params;

        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabaseServer.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
        }

        const review = await prisma.schoolRating.findUnique({
            where: {
                profileId_userId: {
                    profileId,
                    userId: user.id
                }
            }
        });

        if (!review) {
            return NextResponse.json({ error: 'No review found' }, { status: 404 });
        }

        return NextResponse.json(review);

    } catch (error) {
        console.error('[GET MY REVIEW ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch review' }, { status: 500 });
    }
}
