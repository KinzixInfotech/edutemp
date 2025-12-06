// Public API: Submit admission inquiry
// No authentication required - public endpoint

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req) {
    try {
        const body = await req.json();

        const {
            profileId,
            studentName,
            studentAge,
            preferredGrade,
            parentName,
            parentEmail,
            parentPhone,
            message,
            source = 'Website',
        } = body;

        // Validation
        if (!profileId || !studentName || !preferredGrade || !parentName || !parentEmail || !parentPhone) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if school profile exists and is public
        const profile = await prisma.schoolPublicProfile.findUnique({
            where: { schoolId: profileId, isPubliclyVisible: true },
            select: { id: true, schoolId: true }
        });

        if (!profile) {
            return NextResponse.json(
                { error: 'School not found' },
                { status: 404 }
            );
        }

        // Create admission inquiry
        const inquiry = await prisma.admissionInquiry.create({
            data: {
                profileId: profile.id, // Use the resolved internal ID
                studentName,
                studentAge,
                preferredGrade,
                parentName,
                parentEmail,
                parentPhone,
                message,
                source,
                status: 'New',
            }
        });

        // TODO: Send email notification to school admin

        return NextResponse.json({
            success: true,
            inquiryId: inquiry.id,
            message: 'Inquiry submitted successfully. The school will contact you soon.'
        }, { status: 201 });

    } catch (error) {
        console.error('[ADMISSION INQUIRY API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to submit inquiry' },
            { status: 500 }
        );
    }
}
