// Individual Employee Payroll Profile API
// GET - Get employee payroll profile by ID
// PUT - Update employee payroll profile
// DELETE - Delete/deactivate employee payroll profile

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateKey, delCache, invalidatePattern } from "@/lib/cache";

// GET - Get employee payroll profile
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, employeeId } = params;

    try {
        const profile = await prisma.employeePayrollProfile.findUnique({
            where: { id: employeeId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profilePicture: true,
                        gender: true,
                        teacher: {
                            select: {
                                employeeId: true,
                                designation: true,
                                dob: true,
                                contactNumber: true,
                                address: true,
                                department: { select: { name: true } }
                            }
                        },
                        nonTeachingStaff: {
                            select: {
                                employeeId: true,
                                designation: true,
                                dob: true,
                                contactNumber: true,
                                address: true,
                                department: { select: { name: true } }
                            }
                        }
                    }
                },
                salaryStructure: true,
                deductions: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'desc' }
                },
                loans: {
                    where: { status: { in: ['ACTIVE', 'PENDING_APPROVAL'] } },
                    include: {
                        repayments: {
                            where: { status: 'PENDING' },
                            orderBy: { createdAt: 'asc' },
                            take: 3
                        }
                    }
                }
            }
        });

        if (!profile) {
            return NextResponse.json({
                error: 'Employee payroll profile not found'
            }, { status: 404 });
        }

        if (profile.schoolId !== schoolId) {
            return NextResponse.json({
                error: 'Unauthorized'
            }, { status: 403 });
        }

        // Transform data
        const staffData = profile.user.teacher || profile.user.nonTeachingStaff;
        const formattedProfile = {
            ...profile,
            staffEmployeeId: staffData?.employeeId,
            name: profile.user.name,
            email: profile.user.email,
            profilePicture: profile.user.profilePicture,
            gender: profile.user.gender,
            designation: staffData?.designation,
            department: staffData?.department?.name,
            dob: staffData?.dob,
            contactNumber: staffData?.contactNumber,
            address: staffData?.address
        };

        return NextResponse.json(formattedProfile);
    } catch (error) {
        console.error('Employee payroll fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch employee payroll profile',
            details: error.message
        }, { status: 500 });
    }
}

// PUT - Update employee payroll profile
export async function PUT(req, props) {
    const params = await props.params;
    const { schoolId, employeeId } = params;
    const data = await req.json();

    try {
        const existing = await prisma.employeePayrollProfile.findUnique({
            where: { id: employeeId }
        });

        if (!existing) {
            return NextResponse.json({
                error: 'Employee payroll profile not found'
            }, { status: 404 });
        }

        if (existing.schoolId !== schoolId) {
            return NextResponse.json({
                error: 'Unauthorized'
            }, { status: 403 });
        }

        const profile = await prisma.employeePayrollProfile.update({
            where: { id: employeeId },
            data: {
                employeeType: data.employeeType || undefined,
                employmentType: data.employmentType || undefined,
                joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
                confirmationDate: data.confirmationDate ? new Date(data.confirmationDate) : undefined,
                exitDate: data.exitDate ? new Date(data.exitDate) : undefined,
                // Convert empty string to null for UUID fields
                salaryStructureId: data.salaryStructureId === "" ? null : (data.salaryStructureId || undefined),
                bankName: data.bankName || undefined,
                bankBranch: data.bankBranch || undefined,
                accountNumber: data.accountNumber || undefined,
                ifscCode: data.ifscCode || undefined,
                accountHolder: data.accountHolder || undefined,
                upiId: data.upiId || undefined,
                panNumber: data.panNumber || undefined,
                aadharNumber: data.aadharNumber || undefined,
                uanNumber: data.uanNumber || undefined,
                esiNumber: data.esiNumber || undefined,
                taxRegime: data.taxRegime || undefined,
                taxDeclarations: data.taxDeclarations,
                isActive: data.isActive
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                salaryStructure: true
            }
        });

        // Invalidate cache
        await invalidatePattern(`payroll:employees:${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: 'Employee payroll profile updated',
            profile
        });
    } catch (error) {
        console.error('Employee payroll update error:', error);
        return NextResponse.json({
            error: 'Failed to update employee payroll profile',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE - Deactivate employee payroll profile
export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId, employeeId } = params;

    try {
        const existing = await prisma.employeePayrollProfile.findUnique({
            where: { id: employeeId }
        });

        if (!existing) {
            return NextResponse.json({
                error: 'Employee payroll profile not found'
            }, { status: 404 });
        }

        if (existing.schoolId !== schoolId) {
            return NextResponse.json({
                error: 'Unauthorized'
            }, { status: 403 });
        }

        // Soft delete - just deactivate
        await prisma.employeePayrollProfile.update({
            where: { id: employeeId },
            data: {
                isActive: false,
                exitDate: new Date()
            }
        });

        // Invalidate cache
        await invalidatePattern(`payroll:employees:${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: 'Employee payroll profile deactivated'
        });
    } catch (error) {
        console.error('Employee payroll delete error:', error);
        return NextResponse.json({
            error: 'Failed to deactivate employee payroll profile',
            details: error.message
        }, { status: 500 });
    }
}
