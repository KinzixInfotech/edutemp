// Profile Change Request Review API (Master Admin)
// GET  - List change requests (filterable by status, type)
// POST - Approve or reject a change request

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { invalidateSchoolMarketplaceCache } from '@/lib/cache';
import { sendNotification } from '@/lib/notifications/notificationHelper';

export async function GET(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);

        const status = searchParams.get('status'); // PENDING, APPROVED, REJECTED
        const type = searchParams.get('type'); // PROFILE_UPDATE, VERIFICATION_REQUEST
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';

        // If schoolId is "all", fetch across all schools (for master admin global view)
        const schoolFilter = schoolId === 'all' ? {} : { schoolId };

        const where = {
            ...schoolFilter,
            ...(status && { status }),
            ...(type && { type }),
            ...(search && {
                school: {
                    name: { contains: search, mode: 'insensitive' },
                },
            }),
        };

        const [items, total] = await Promise.all([
            prisma.profileChangeRequest.findMany({
                where,
                include: {
                    school: {
                        select: { id: true, name: true, profilePicture: true, location: true },
                    },
                    requestedBy: {
                        select: { id: true, name: true, email: true, profilePicture: true },
                    },
                    reviewedBy: {
                        select: { id: true, name: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.profileChangeRequest.count({ where }),
        ]);

        // Summary counts
        const summaryWhere = schoolId === 'all' ? {} : { schoolId };
        const [pending, approved, rejected] = await Promise.all([
            prisma.profileChangeRequest.count({ where: { ...summaryWhere, status: 'PENDING' } }),
            prisma.profileChangeRequest.count({ where: { ...summaryWhere, status: 'APPROVED' } }),
            prisma.profileChangeRequest.count({ where: { ...summaryWhere, status: 'REJECTED' } }),
        ]);

        return NextResponse.json({
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            summary: { total: pending + approved + rejected, pending, approved, rejected },
        });

    } catch (error) {
        console.error('[PROFILE CHANGES API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile changes', details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;
        const body = await req.json();
        const { changeRequestId, action, remarks, reviewerId } = body;

        if (!changeRequestId || !action || !reviewerId) {
            return NextResponse.json(
                { error: 'Missing required fields: changeRequestId, action, reviewerId' },
                { status: 400 }
            );
        }

        if (action === 'reject' && !remarks) {
            return NextResponse.json(
                { error: 'Rejection remarks are required' },
                { status: 400 }
            );
        }

        // Fetch the change request
        const changeRequest = await prisma.profileChangeRequest.findUnique({
            where: { id: changeRequestId },
            include: {
                school: { select: { name: true } },
            },
        });

        if (!changeRequest) {
            return NextResponse.json({ error: 'Change request not found' }, { status: 404 });
        }

        if (changeRequest.status !== 'PENDING') {
            return NextResponse.json({ error: 'Change request already processed' }, { status: 400 });
        }

        const now = new Date();

        if (action === 'approve') {
            let updatedProfile = null;
            if (changeRequest.type === 'PROFILE_UPDATE') {
                // Apply the changes to the actual profile
                const changes = changeRequest.changes;
                const updateData = {};
                for (const [field, diff] of Object.entries(changes)) {
                    updateData[field] = diff.new;
                }

                updatedProfile = await prisma.schoolPublicProfile.update({
                    where: { schoolId: changeRequest.schoolId },
                    data: updateData,
                    select: { id: true, schoolId: true, slug: true },
                });

            } else if (changeRequest.type === 'VERIFICATION_REQUEST') {
                // Set isVerified = true on the profile
                updatedProfile = await prisma.schoolPublicProfile.update({
                    where: { schoolId: changeRequest.schoolId },
                    data: { isVerified: true },
                    select: { id: true, schoolId: true, slug: true },
                });
            }

            if (updatedProfile) {
                await invalidateSchoolMarketplaceCache(updatedProfile);
            }
        }

        // Update the change request status
        const updated = await prisma.profileChangeRequest.update({
            where: { id: changeRequestId },
            data: {
                status: action === 'approve' ? 'APPROVED' : 'REJECTED',
                reviewedById: reviewerId,
                reviewedAt: now,
                reviewRemarks: remarks || null,
            },
        });

        // Notify the admin who submitted the request
        const typeLabel = changeRequest.type === 'VERIFICATION_REQUEST'
            ? 'Verification Request'
            : 'Profile Update';
        const actionLabel = action === 'approve' ? 'Approved ✅' : 'Rejected ❌';

        await sendNotification({
            schoolId: changeRequest.schoolId,
            title: `${typeLabel} ${actionLabel}`,
            message: action === 'approve'
                ? `Your ${typeLabel.toLowerCase()} for ${changeRequest.school?.name || 'your school'} has been approved and changes are now live.`
                : `Your ${typeLabel.toLowerCase()} for ${changeRequest.school?.name || 'your school'} was rejected. ${remarks ? `Reason: ${remarks}` : ''}`,
            type: 'GENERAL',
            priority: 'HIGH',
            targetOptions: { userIds: [changeRequest.requestedById] },
            senderId: reviewerId,
            metadata: { changeRequestId: changeRequest.id, action },
            actionUrl: '/dashboard/school-explorer/profile',
            sendPush: true,
        });

        return NextResponse.json({
            success: true,
            message: `Change request ${action}ed successfully`,
            result: updated,
        });

    } catch (error) {
        console.error('[PROFILE CHANGES REVIEW API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to process change request', details: error.message },
            { status: 500 }
        );
    }
}
