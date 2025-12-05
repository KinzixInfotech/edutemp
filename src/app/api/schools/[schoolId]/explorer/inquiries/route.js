// Admin API: Get Admission Inquiries
// Auth required - ADMIN only

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);

        // Filters
        const status = searchParams.get('status') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        // Get public profile
        const profile = await prisma.schoolPublicProfile.findUnique({
            where: { schoolId },
            select: { id: true }
        });

        if (!profile) {
            return NextResponse.json({ inquiries: [], total: 0 });
        }

        const where = {
            profileId: profile.id,
            ...(status && { status }),
        };

        const [inquiries, total] = await Promise.all([
            prisma.admissionInquiry.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.admissionInquiry.count({ where })
        ]);

        return NextResponse.json({
            inquiries,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            }
        });

    } catch (error) {
        console.error('[INQUIRIES API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch inquiries' },
            { status: 500 }
        );
    }
}

// Update inquiry status
export async function PATCH(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;
        const body = await req.json();
        const { inquiryId, status, notes } = body;

        // Verify inquiry belongs to this school
        const inquiry = await prisma.admissionInquiry.findFirst({
            where: {
                id: inquiryId,
                profile: { schoolId }
            }
        });

        if (!inquiry) {
            return NextResponse.json(
                { error: 'Inquiry not found' },
                { status: 404 }
            );
        }

        // Update inquiry
        const updated = await prisma.admissionInquiry.update({
            where: { id: inquiryId },
            data: {
                ...(status && { status }),
                ...(notes !== undefined && { notes }),
                updatedAt: new Date(),
            }
        });

        return NextResponse.json(updated);

    } catch (error) {
        console.error('[INQUIRY UPDATE API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to update inquiry' },
            { status: 500 }
        );
    }
}
