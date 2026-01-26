// Employee Payroll Profiles API
// GET - List all employee payroll profiles
// POST - Create new employee payroll profile

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

// GET - List all employee payroll profiles for school
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const employeeType = searchParams.get('employeeType'); // TEACHING, NON_TEACHING
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    try {
        const cacheKey = generateKey(`payroll:employees:${schoolId}`, {
            page, limit, employeeType, isActive, search
        });

        const result = await remember(cacheKey, async () => {
            const skip = (page - 1) * limit;

            const where = {
                schoolId,
                ...(employeeType && { employeeType }),
                ...(isActive !== null && isActive !== undefined && { isActive: isActive === 'true' }),
            };

            // If search is provided, we need to join with User
            const [employees, total] = await Promise.all([
                prisma.employeePayrollProfile.findMany({
                    where,
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                profilePicture: true,
                                teacher: {
                                    select: {
                                        employeeId: true,
                                        designation: true,
                                        department: { select: { name: true } }
                                    }
                                },
                                nonTeachingStaff: {
                                    select: {
                                        employeeId: true,
                                        designation: true,
                                        department: { select: { name: true } }
                                    }
                                }
                            }
                        },
                        salaryStructure: {
                            select: {
                                id: true,
                                name: true,
                                grossSalary: true,
                                ctc: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit
                }),
                prisma.employeePayrollProfile.count({ where })
            ]);

            // Transform data
            const formattedEmployees = employees.map(emp => ({
                ...emp,
                employeeId: emp.user.teacher?.employeeId || emp.user.nonTeachingStaff?.employeeId,
                name: emp.user.name,
                email: emp.user.email,
                profilePicture: emp.user.profilePicture,
                designation: emp.user.teacher?.designation || emp.user.nonTeachingStaff?.designation,
                department: emp.user.teacher?.department?.name || emp.user.nonTeachingStaff?.department?.name
            }));

            return {
                employees: formattedEmployees,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        }, 300); // Cache for 5 minutes

        return NextResponse.json(result);
    } catch (error) {
        console.error('Employee payroll list error:', error);
        return NextResponse.json({
            error: 'Failed to fetch employee payroll profiles',
            details: error.message
        }, { status: 500 });
    }
}

// POST - Create new employee payroll profile
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const data = await req.json();

    const {
        userId,
        employeeType,
        employmentType,
        joiningDate,
        confirmationDate,
        salaryStructureId,
        // Bank Details
        bankName,
        bankBranch,
        accountNumber,
        ifscCode,
        accountHolder,
        upiId,
        // Tax Details
        panNumber,
        aadharNumber,
        uanNumber,
        esiNumber,
        taxRegime,
        taxDeclarations
    } = data;

    if (!userId || !employeeType || !joiningDate) {
        return NextResponse.json({
            error: 'userId, employeeType, and joiningDate are required'
        }, { status: 400 });
    }

    try {
        // Check if profile already exists
        const existing = await prisma.employeePayrollProfile.findUnique({
            where: { userId }
        });

        if (existing) {
            return NextResponse.json({
                error: 'Employee payroll profile already exists for this user'
            }, { status: 400 });
        }

        // Create profile
        const profile = await prisma.employeePayrollProfile.create({
            data: {
                userId,
                schoolId,
                employeeType,
                employmentType: employmentType || 'PERMANENT',
                joiningDate: new Date(joiningDate),
                confirmationDate: confirmationDate ? new Date(confirmationDate) : null,
                salaryStructureId,
                bankName,
                bankBranch,
                accountNumber,
                ifscCode,
                accountHolder,
                upiId,
                panNumber,
                aadharNumber,
                uanNumber,
                esiNumber,
                taxRegime: taxRegime || 'NEW',
                taxDeclarations,
                isActive: true
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
            message: 'Employee payroll profile created successfully',
            profile
        });
    } catch (error) {
        console.error('Employee payroll create error:', error);
        return NextResponse.json({
            error: 'Failed to create employee payroll profile',
            details: error.message
        }, { status: 500 });
    }
}
