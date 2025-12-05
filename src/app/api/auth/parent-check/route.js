// Helper API: Check if authenticated user is a parent of a specific school
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('schoolId');

        // Check authentication
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '')
        );

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
        }

        // Find parent record
        const parent = await prisma.parent.findFirst({
            where: { userId: user.id }
        });

        if (!parent) {
            return NextResponse.json({
                isParent: false,
                error: 'Only parents can submit reviews'
            }, { status: 403 });
        }

        // Check if parent belongs to the requested school
        if (schoolId && parent.schoolId !== schoolId) {
            return NextResponse.json({
                isParent: true,
                canReviewThisSchool: false,
                error: 'You can only review your child\'s school'
            }, { status: 403 });
        }

        return NextResponse.json({
            isParent: true,
            canReviewThisSchool: true,
            parentId: parent.id,
            schoolId: parent.schoolId
        });

    } catch (error) {
        console.error('[PARENT CHECK ERROR]', error);
        return NextResponse.json({ error: 'Failed to verify parent status' }, { status: 500 });
    }
}
