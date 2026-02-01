// Admin: Approve or Reject pending profile updates
// POST /api/schools/[schoolId]/payroll/employees/[employeeId]/approve-update

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications/notificationHelper';

export async function POST(req, props) {
    const params = await props.params;
    const { schoolId, employeeId } = params;

    try {
        const body = await req.json();
        const { action, rejectionReason, approvedBy } = body;

        if (!['approve', 'reject'].includes(action)) {
            return NextResponse.json({
                error: 'Invalid action. Must be "approve" or "reject"'
            }, { status: 400 });
        }

        if (!approvedBy) {
            return NextResponse.json({
                error: 'approvedBy is required'
            }, { status: 400 });
        }

        // Find the employee profile
        const profile = await prisma.employeePayrollProfile.findUnique({
            where: { id: employeeId },
            include: {
                user: { select: { id: true, name: true } }
            }
        });

        if (!profile) {
            return NextResponse.json({
                error: 'Employee profile not found'
            }, { status: 404 });
        }

        if (profile.schoolId !== schoolId) {
            return NextResponse.json({
                error: 'Unauthorized'
            }, { status: 403 });
        }

        // Check if there are pending updates
        if (!profile.pendingBankDetails && !profile.pendingIdDetails) {
            return NextResponse.json({
                error: 'No pending updates to process'
            }, { status: 400 });
        }

        if (action === 'approve') {
            // Apply pending updates to actual fields
            const updateData = {
                pendingApprovedAt: new Date(),
                pendingApprovedBy: approvedBy,
                pendingBankDetails: null,
                pendingIdDetails: null,
                pendingSubmittedAt: null
            };

            // Apply bank details if pending
            if (profile.pendingBankDetails) {
                const bank = profile.pendingBankDetails;
                if (bank.bankName) updateData.bankName = bank.bankName;
                if (bank.accountNumber) updateData.accountNumber = bank.accountNumber;
                if (bank.ifscCode) updateData.ifscCode = bank.ifscCode;
                if (bank.accountHolder) updateData.accountHolder = bank.accountHolder;
                if (bank.upiId) updateData.upiId = bank.upiId;
            }

            // Apply ID details if pending
            if (profile.pendingIdDetails) {
                const ids = profile.pendingIdDetails;
                if (ids.panNumber) updateData.panNumber = ids.panNumber;
                if (ids.aadharNumber) updateData.aadharNumber = ids.aadharNumber;
                if (ids.uanNumber) updateData.uanNumber = ids.uanNumber;
                if (ids.esiNumber) updateData.esiNumber = ids.esiNumber;
            }

            await prisma.employeePayrollProfile.update({
                where: { id: employeeId },
                data: updateData
            });

            // Notify employee of approval
            try {
                await sendNotification({
                    schoolId,
                    title: '✅ Profile Update Approved',
                    message: 'Your profile updates have been approved and are now active.',
                    type: 'PAYROLL',
                    priority: 'NORMAL',
                    targetOptions: {
                        userIds: [profile.userId]
                    },
                    senderId: approvedBy,
                    metadata: {
                        type: 'PROFILE_UPDATE_APPROVED',
                        employeeId
                    }
                });
            } catch (notifError) {
                console.error('Notification failed:', notifError);
            }

            return NextResponse.json({
                success: true,
                message: 'Profile updates approved and applied successfully'
            });

        } else {
            // Reject - keep pending data for reference but mark as rejected
            if (!rejectionReason) {
                return NextResponse.json({
                    error: 'Rejection reason is required'
                }, { status: 400 });
            }

            await prisma.employeePayrollProfile.update({
                where: { id: employeeId },
                data: {
                    pendingRejectedAt: new Date(),
                    pendingRejectedBy: approvedBy,
                    pendingRejectionReason: rejectionReason,
                    pendingSubmittedAt: null
                }
            });

            // Notify employee of rejection
            try {
                await sendNotification({
                    schoolId,
                    title: '❌ Profile Update Rejected',
                    message: `Your profile update request was rejected. Reason: ${rejectionReason}`,
                    type: 'PAYROLL',
                    priority: 'NORMAL',
                    targetOptions: {
                        userIds: [profile.userId]
                    },
                    senderId: approvedBy,
                    metadata: {
                        type: 'PROFILE_UPDATE_REJECTED',
                        employeeId,
                        reason: rejectionReason
                    }
                });
            } catch (notifError) {
                console.error('Notification failed:', notifError);
            }

            return NextResponse.json({
                success: true,
                message: 'Profile updates rejected'
            });
        }

    } catch (error) {
        console.error('Approve/reject update error:', error);
        return NextResponse.json({
            error: 'Failed to process profile update',
            details: error.message
        }, { status: 500 });
    }
}

// GET - List employees with pending updates
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const pendingProfiles = await prisma.employeePayrollProfile.findMany({
            where: {
                schoolId,
                pendingSubmittedAt: { not: null },
                pendingApprovedAt: null,
                pendingRejectedAt: null
            },
            include: {
                user: { select: { name: true, email: true } }
            },
            orderBy: { pendingSubmittedAt: 'desc' }
        });

        return NextResponse.json({
            pendingCount: pendingProfiles.length,
            profiles: pendingProfiles.map(p => ({
                id: p.id,
                userId: p.userId,
                name: p.user?.name,
                email: p.user?.email,
                submittedAt: p.pendingSubmittedAt,
                hasBankUpdate: !!p.pendingBankDetails,
                hasIdUpdate: !!p.pendingIdDetails,
                pendingBankDetails: p.pendingBankDetails,
                pendingIdDetails: p.pendingIdDetails
            }))
        });

    } catch (error) {
        console.error('Get pending updates error:', error);
        return NextResponse.json({
            error: 'Failed to get pending updates',
            details: error.message
        }, { status: 500 });
    }
}
