import { withSchoolAccess } from "@/lib/api-auth"; // Verification Request API
// POST - Admin requests verified badge for their school profile

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications/notificationHelper';

export const POST = withSchoolAccess(async function POST(req, props) {
  try {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { requestedById } = body;

    if (!requestedById) {
      return NextResponse.json(
        { error: 'Missing requestedById' },
        { status: 400 }
      );
    }

    // Check if already verified
    const profile = await prisma.schoolPublicProfile.findUnique({
      where: { schoolId }
    });

    if (profile?.isVerified) {
      return NextResponse.json(
        { error: 'Profile is already verified' },
        { status: 400 }
      );
    }

    // Check if there's already a pending verification request
    const existingRequest = await prisma.profileChangeRequest.findFirst({
      where: {
        schoolId,
        type: 'VERIFICATION_REQUEST',
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A verification request is already pending', existingRequest },
        { status: 400 }
      );
    }

    // Create verification request
    const changeRequest = await prisma.profileChangeRequest.create({
      data: {
        schoolId,
        requestedById,
        changes: { isVerified: { old: false, new: true } },
        type: 'VERIFICATION_REQUEST',
        status: 'PENDING'
      }
    });

    // Notify SUPER_ADMIN users
    const superAdmins = await prisma.user.findMany({
      where: {
        role: { name: 'SUPER_ADMIN' }
      },
      select: { id: true }
    });

    if (superAdmins.length > 0) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true }
      });

      await sendNotification({
        schoolId,
        title: '🔵 Verification Badge Request',
        message: `${school?.name || 'A school'} has requested a verified profile badge.`,
        type: 'GENERAL',
        priority: 'HIGH',
        targetOptions: { userIds: superAdmins.map((u) => u.id) },
        senderId: requestedById,
        metadata: { changeRequestId: changeRequest.id, type: 'VERIFICATION_REQUEST' },
        actionUrl: '/dashboard/master-admin/profile-reviews',
        sendPush: true
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Verification request submitted',
      changeRequest
    });

  } catch (error) {
    console.error('[VERIFICATION REQUEST API ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to submit verification request', details: error.message },
      { status: 500 }
    );
  }
});