// Sync All Staff to Payroll API
// POST /api/schools/[schoolId]/payroll/employees/sync
// Automatically creates payroll profiles for all teaching and non-teaching staff

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from "@/lib/cache";

export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json();
        const { defaultSalaryStructureId, joiningDate, employmentType = 'PERMANENT' } = body;

        // Get all teaching staff
        const teachingStaff = await prisma.teachingStaff.findMany({
            where: {
                schoolId,
                user: { status: 'ACTIVE' }
            },
            select: {
                userId: true,
                user: { select: { createdAt: true } }
            }
        });

        // Get all non-teaching staff
        const nonTeachingStaff = await prisma.nonTeachingStaff.findMany({
            where: {
                schoolId,
                user: { status: 'ACTIVE' }
            },
            select: {
                userId: true,
                user: { select: { createdAt: true } }
            }
        });

        console.log(`[Sync] Found ${teachingStaff.length} teaching staff and ${nonTeachingStaff.length} non-teaching staff for school ${schoolId}`);

        // Get existing payroll profiles
        const existingProfiles = await prisma.employeePayrollProfile.findMany({
            where: { schoolId },
            select: { userId: true }
        });
        const existingUserIds = new Set(existingProfiles.map(p => p.userId));

        // Filter out already enrolled
        const newTeaching = teachingStaff.filter(s => !existingUserIds.has(s.userId));
        const newNonTeaching = nonTeachingStaff.filter(s => !existingUserIds.has(s.userId));

        let added = 0;
        let failed = 0;

        // Create profiles for teaching staff
        for (const staff of newTeaching) {
            try {
                await prisma.employeePayrollProfile.create({
                    data: {
                        schoolId,
                        userId: staff.userId,
                        employeeType: 'TEACHING',
                        employmentType,
                        joiningDate: joiningDate ? new Date(joiningDate) : staff.user?.createdAt || new Date(),
                        salaryStructureId: defaultSalaryStructureId || null,
                        isActive: true
                    }
                });
                added++;
            } catch (err) {
                console.error(`Failed to create profile for teaching staff ${staff.userId}:`, err.message);
                failed++;
            }
        }

        // Create profiles for non-teaching staff
        for (const staff of newNonTeaching) {
            try {
                await prisma.employeePayrollProfile.create({
                    data: {
                        schoolId,
                        userId: staff.userId,
                        employeeType: 'NON_TEACHING',
                        employmentType,
                        joiningDate: joiningDate ? new Date(joiningDate) : staff.user?.createdAt || new Date(),
                        salaryStructureId: defaultSalaryStructureId || null,
                        isActive: true
                    }
                });
                added++;
            } catch (err) {
                console.error(`Failed to create profile for non-teaching staff ${staff.userId}:`, err.message);
                failed++;
            }
        }

        // Invalidate cache
        await invalidatePattern(`payroll:employees:${schoolId}*`);

        return NextResponse.json({
            success: true,
            added,
            failed,
            skipped: existingProfiles.length,
            message: `Synced ${added} staff members${failed > 0 ? `, ${failed} failed` : ''}`,
            details: {
                teachingAdded: newTeaching.length - (failed > 0 ? Math.min(failed, newTeaching.length) : 0),
                nonTeachingAdded: newNonTeaching.length - (failed > newTeaching.length ? failed - newTeaching.length : 0),
                alreadyEnrolled: existingProfiles.length
            }
        });
    } catch (error) {
        console.error('Sync staff error:', error);
        return NextResponse.json({
            error: 'Failed to sync staff',
            details: error.message
        }, { status: 500 });
    }
}
