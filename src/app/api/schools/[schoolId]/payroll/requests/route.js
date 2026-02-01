
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profilePicture: true,
                        teacher: {
                            select: {
                                designation: true,
                                department: { select: { name: true } },
                                employeeId: true
                            }
                        },
                        nonTeachingStaff: {
                            select: {
                                designation: true,
                                department: { select: { name: true } },
                                employeeId: true
                            }
                        }
                    }
                },
                salaryStructure: { select: { name: true } }
            },
            orderBy: { pendingSubmittedAt: 'desc' }
        });

        // Transform data
        const profiles = pendingProfiles.map(p => {
            const staffDetails = p.user.teacher || p.user.nonTeachingStaff;
            return {
                id: p.id,
                userId: p.userId,
                name: p.user?.name,
                email: p.user?.email,
                profilePicture: p.user?.profilePicture,
                staffId: staffDetails?.employeeId,
                designation: staffDetails?.designation,
                department: staffDetails?.department?.name,
                submittedAt: p.pendingSubmittedAt,
                hasBankUpdate: !!p.pendingBankDetails,
                hasIdUpdate: !!p.pendingIdDetails,
                pendingBankDetails: p.pendingBankDetails,
                pendingIdDetails: p.pendingIdDetails,
                // Current details for comparison
                currentBankDetails: {
                    bankName: p.bankName,
                    accountNumber: p.accountNumber,
                    ifscCode: p.ifscCode,
                    accountHolder: p.accountHolder,
                    upiId: p.upiId
                },
                currentIdDetails: {
                    panNumber: p.panNumber,
                    aadharNumber: p.aadharNumber,
                    uanNumber: p.uanNumber,
                    esiNumber: p.esiNumber,
                    taxRegime: p.taxRegime
                }
            };
        });

        return NextResponse.json({
            pendingCount: profiles.length,
            profiles
        });

    } catch (error) {
        console.error('Get pending updates error:', error);
        return NextResponse.json({
            error: 'Failed to get pending updates',
            details: error.message
        }, { status: 500 });
    }
}
