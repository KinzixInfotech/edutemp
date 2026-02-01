// Staff Self-Service: Submit bank/ID details for admin approval
// PATCH /api/schools/[schoolId]/teachers/[userId]/payroll/profile/self-service

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications/notificationHelper';

export async function PATCH(req, props) {
    const params = await props.params;
    const { schoolId, userId } = params;

    try {
        const body = await req.json();
        const { bankDetails, idDetails } = body;

        // Find the employee's payroll profile
        const profile = await prisma.employeePayrollProfile.findUnique({
            where: { userId }
        });

        if (!profile) {
            return NextResponse.json({
                error: 'Payroll profile not found'
            }, { status: 404 });
        }

        if (profile.schoolId !== schoolId) {
            return NextResponse.json({
                error: 'Unauthorized'
            }, { status: 403 });
        }

        // Prepare update data
        const updateData = {
            pendingSubmittedAt: new Date(),
            // Clear any previous rejection
            pendingRejectedAt: null,
            pendingRejectedBy: null,
            pendingRejectionReason: null
        };

        // Add pending bank details if provided
        if (bankDetails) {
            // Validate required bank fields
            if (bankDetails.accountNumber && bankDetails.ifscCode) {
                updateData.pendingBankDetails = {
                    bankName: bankDetails.bankName || null,
                    accountNumber: bankDetails.accountNumber,
                    ifscCode: bankDetails.ifscCode.toUpperCase(),
                    accountHolder: bankDetails.accountHolder || null,
                    upiId: bankDetails.upiId || null
                };
            } else {
                return NextResponse.json({
                    error: 'Account number and IFSC code are required for bank details'
                }, { status: 400 });
            }
        }

        // Add pending ID details if provided
        if (idDetails) {
            updateData.pendingIdDetails = {
                panNumber: idDetails.panNumber?.toUpperCase() || null,
                aadharNumber: idDetails.aadharNumber || null,
                uanNumber: idDetails.uanNumber || null,
                esiNumber: idDetails.esiNumber || null
            };
        }

        // Update the profile
        const updatedProfile = await prisma.employeePayrollProfile.update({
            where: { userId },
            data: updateData
        });

        // Get user name for notification
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true }
        });

        // Notify admin about pending update
        try {
            await sendNotification({
                schoolId,
                title: '📝 Profile Update Request',
                message: `${user?.name || 'An employee'} has submitted updated ${bankDetails ? 'bank details' : ''}${bankDetails && idDetails ? ' and ' : ''}${idDetails ? 'ID documents' : ''} for approval.`,
                type: 'APPROVAL_REQUIRED',
                priority: 'NORMAL',
                targetOptions: {
                    roleNames: ['ADMIN', 'DIRECTOR', 'ACCOUNTANT']
                },
                senderId: userId,
                metadata: {
                    type: 'PROFILE_UPDATE_REQUEST',
                    employeeId: profile.id,
                    userId
                },
                actionUrl: '/dashboard/payroll/employees'
            });
        } catch (notifError) {
            console.error('Notification failed:', notifError);
        }

        return NextResponse.json({
            success: true,
            message: 'Profile update submitted for admin approval. Changes will reflect after approval.',
            pendingBankDetails: !!bankDetails,
            pendingIdDetails: !!idDetails
        });

    } catch (error) {
        console.error('Self-service update error:', error);
        return NextResponse.json({
            error: 'Failed to submit profile update',
            details: error.message
        }, { status: 500 });
    }
}

// GET - Check pending updates status
export async function GET(req, props) {
    const params = await props.params;
    const { userId } = params;

    try {
        const profile = await prisma.employeePayrollProfile.findUnique({
            where: { userId },
            select: {
                pendingBankDetails: true,
                pendingIdDetails: true,
                pendingSubmittedAt: true,
                pendingApprovedAt: true,
                pendingRejectedAt: true,
                pendingRejectionReason: true
            }
        });

        if (!profile) {
            return NextResponse.json({
                error: 'Profile not found'
            }, { status: 404 });
        }

        let status = 'NONE';
        if (profile.pendingRejectedAt) {
            status = 'REJECTED';
        } else if (profile.pendingSubmittedAt && !profile.pendingApprovedAt) {
            status = 'PENDING';
        } else if (profile.pendingApprovedAt) {
            status = 'APPROVED';
        }

        return NextResponse.json({
            status,
            hasPendingBankDetails: !!profile.pendingBankDetails,
            hasPendingIdDetails: !!profile.pendingIdDetails,
            submittedAt: profile.pendingSubmittedAt,
            rejectionReason: profile.pendingRejectionReason
        });

    } catch (error) {
        console.error('Get pending status error:', error);
        return NextResponse.json({
            error: 'Failed to get pending status',
            details: error.message
        }, { status: 500 });
    }
}
