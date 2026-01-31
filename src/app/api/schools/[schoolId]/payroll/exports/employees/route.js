// Employee Export API
// GET /api/schools/[schoolId]/payroll/exports/employees
// Export all employees with payroll profiles

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const format = searchParams.get('format') || 'csv';

    try {
        // Get all employees with payroll profiles
        const employees = await prisma.employeePayrollProfile.findMany({
            where: { schoolId },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                        status: true
                    }
                },
                salaryStructure: {
                    select: {
                        name: true,
                        grossSalary: true
                    }
                }
            },
            orderBy: { user: { name: 'asc' } }
        });

        // Get staff details for each employee
        const employeeData = await Promise.all(
            employees.map(async (emp) => {
                let staffDetails = await prisma.teachingStaff.findUnique({
                    where: { userId: emp.userId },
                    select: {
                        employeeId: true,
                        designation: true,
                        department: { select: { name: true } },
                        joiningDate: true
                    }
                });

                if (!staffDetails) {
                    staffDetails = await prisma.nonTeachingStaff.findUnique({
                        where: { userId: emp.userId },
                        select: {
                            employeeId: true,
                            designation: true,
                            joiningDate: true
                        }
                    });
                }

                return {
                    employeeId: staffDetails?.employeeId || emp.userId.substring(0, 8),
                    name: emp.user?.name || 'Unknown',
                    email: emp.user?.email || 'N/A',
                    phone: emp.user?.phone || 'N/A',
                    type: emp.employeeType,
                    designation: staffDetails?.designation || 'N/A',
                    department: staffDetails?.department?.name || 'General',
                    joiningDate: staffDetails?.joiningDate ? new Date(staffDetails.joiningDate).toLocaleDateString('en-IN') : 'N/A',
                    status: emp.payrollStatus,
                    salaryStructure: emp.salaryStructure?.name || 'Not Assigned',
                    grossSalary: emp.salaryStructure?.grossSalary || 0,
                    panNumber: emp.panNumber || 'N/A',
                    aadharNumber: emp.aadharNumber || 'N/A',
                    uanNumber: emp.uanNumber || 'N/A',
                    esicNumber: emp.esicNumber || 'N/A',
                    bankName: emp.bankName || 'N/A',
                    accountNumber: emp.accountNumber || 'N/A',
                    ifscCode: emp.ifscCode || 'N/A',
                    accountType: emp.accountType || 'N/A'
                };
            })
        );

        if (format === 'csv') {
            const headers = [
                'Employee ID', 'Name', 'Email', 'Phone', 'Type', 'Designation', 'Department',
                'Joining Date', 'Status', 'Salary Structure', 'Gross Salary',
                'PAN', 'Aadhar', 'UAN', 'ESIC',
                'Bank Name', 'Account Number', 'IFSC', 'Account Type'
            ].join(',');

            const rows = employeeData.map(e => [
                e.employeeId,
                `"${e.name}"`,
                e.email,
                e.phone,
                e.type,
                `"${e.designation}"`,
                `"${e.department}"`,
                e.joiningDate,
                e.status,
                `"${e.salaryStructure}"`,
                e.grossSalary,
                e.panNumber,
                e.aadharNumber,
                e.uanNumber,
                e.esicNumber,
                `"${e.bankName}"`,
                e.accountNumber,
                e.ifscCode,
                e.accountType
            ].join(','));

            const csv = [headers, ...rows].join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="Employee_Master_Export.csv"`
                }
            });
        }

        return NextResponse.json({
            exportType: 'EMPLOYEE_MASTER',
            generatedAt: new Date().toISOString(),
            totalEmployees: employeeData.length,
            employees: employeeData
        });

    } catch (error) {
        console.error('Employee export error:', error);
        return NextResponse.json({
            error: 'Failed to export employees',
            details: error.message
        }, { status: 500 });
    }
}
