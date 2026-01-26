import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, generateKey } from "@/lib/cache";

export async function GET(req, props) {
    const params = await props.params;
    const { userId } = params;
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!userId || !schoolId) {
        return NextResponse.json({ error: 'Missing userId or schoolId' }, { status: 400 });
    }

    try {
        const cacheKey = generateKey('transport:staff:payroll', { schoolId, userId });

        const result = await remember(cacheKey, async () => {
            // 1. Try to fetch details from EmployeePayrollProfile (Rich Data)
            const profile = await prisma.employeePayrollProfile.findUnique({
                where: { userId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            profilePicture: true,
                            // Attempt to get TransportStaff details if relation exists
                            // Note: If relation name differs, this might need adjustment. 
                            // Using safe assumption or fallback in mapping.
                        }
                    },
                    salaryStructure: true,
                    loans: {
                        where: { status: 'ACTIVE' },
                        include: { repaymentSchedule: false } // Avoid too much data
                    }
                }
            });

            // If we have a full payroll profile
            if (profile) {
                // Fetch Staff details separately to be safe about relation names or if 1:1 is tricky
                const transportStaff = await prisma.transportStaff.findFirst({
                    where: { userId, schoolId },
                    select: { designation: true, employeeId: true, department: true }
                });

                // Get latest Payslip (Transport usually uses Payslip model for PDF generation)
                // We check both PayrollItem (new system) and Payslip (snapshot)
                // Let's prefer Payslip for Transport as they might be generated explicitly.
                const latestPayslip = await prisma.payslip.findFirst({
                    where: { employeeId: profile.id },
                    orderBy: [{ year: 'desc' }, { month: 'desc' }]
                });

                // YTD from Payslips
                const currentYear = new Date().getFullYear();
                const ytdPayslips = await prisma.payslip.findMany({
                    where: {
                        employeeId: profile.id,
                        year: currentYear
                    },
                    select: {
                        grossEarnings: true,
                        netSalary: true,
                        totalDeductions: true,
                        deductions: true // JSON
                    }
                });

                const ytd = ytdPayslips.reduce((acc, p) => {
                    const ded = p.deductions || {};
                    return {
                        grossEarnings: acc.grossEarnings + (p.grossEarnings || 0),
                        netSalary: acc.netSalary + (p.netSalary || 0),
                        totalDeductions: acc.totalDeductions + (p.totalDeductions || 0),
                        pfContribution: acc.pfContribution + (Number(ded.pf) || 0),
                        tds: acc.tds + (Number(ded.tds) || 0)
                    };
                }, { year: currentYear, grossEarnings: 0, netSalary: 0, totalDeductions: 0, pfContribution: 0, tds: 0 });

                return {
                    profile: {
                        id: profile.id,
                        userId: profile.userId,
                        name: profile.user.name,
                        email: profile.user.email,
                        profilePicture: profile.user.profilePicture,

                        // Employment
                        employeeId: transportStaff?.employeeId,
                        designation: transportStaff?.designation || 'Transport Staff',
                        department: transportStaff?.department || 'Transport',
                        joiningDate: profile.joiningDate,
                        confirmationDate: profile.confirmationDate,
                        employmentType: profile.employmentType,

                        // Bank Details (Unmasked)
                        bankName: profile.bankName,
                        bankBranch: profile.bankBranch,
                        accountNumber: profile.accountNumber,
                        ifscCode: profile.ifscCode,
                        accountHolder: profile.accountHolder,
                        upiId: profile.upiId,

                        // Tax & Statutory
                        panNumber: profile.panNumber,
                        uanNumber: profile.uanNumber,
                        esiNumber: profile.esiNumber,
                        taxRegime: profile.taxRegime,
                    },
                    salaryStructure: profile.salaryStructure,
                    latestPayslip: latestPayslip ? {
                        ...latestPayslip,
                        monthName: new Date(2000, latestPayslip.month - 1).toLocaleString('default', { month: 'short' }),
                    } : null,
                    ytd,
                    loans: profile.loans,
                    loansEnabled: true
                };
            }

            // Fallback: No Payroll Profile (Old Logic)
            const staff = await prisma.transportStaff.findFirst({
                where: { userId, schoolId },
                select: { id: true, employeeId: true, name: true, designation: true }
            });

            if (!staff) {
                return { error: 'Staff not found' };
            }

            const latestPayslip = await prisma.payslip.findFirst({
                where: { employeeId_staff: staff.employeeId }, // Fallback to string ID match if needed
                orderBy: [{ year: 'desc' }, { month: 'desc' }],
            });

            // If fetching by employeeId UUID fails, try fetch by string ID or vice versa. 
            // The schema has `employeeId` as UUID FK to EmployeePayrollProfile. 
            // But `employeeId_staff` is string.
            // If they don't have a profile, they might not have a linked Payslip row. 
            // But let's assume if no profile, no advanced payroll.

            return {
                profile: {
                    name: staff.name,
                    employeeId: staff.employeeId,
                    designation: staff.designation
                },
                latestPayslip: latestPayslip || null,
                ytd: { year: new Date().getFullYear(), grossEarnings: 0, netSalary: 0 },
                loansEnabled: false
            };

        }, 300); // 5 min cache

        if (result.error) return NextResponse.json(result, { status: 404 });
        return NextResponse.json(result);

    } catch (error) {
        console.error('Transport payroll fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch payroll data' }, { status: 500 });
    }
}
