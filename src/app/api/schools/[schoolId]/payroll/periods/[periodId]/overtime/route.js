import { withSchoolAccess } from "@/lib/api-auth";
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getPayrollConfigForSchool } from '@/lib/payroll/config';

export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  const { schoolId, periodId } = params;

  try {
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: periodId }
    });

    if (!period) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 });
    }

    if (period.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const payrollConfig = await getPayrollConfigForSchool(schoolId);
    const records = await prisma.attendance.findMany({
      where: {
        schoolId,
        date: {
          gte: period.startDate,
          lte: period.endDate
        },
        overtimeHours: { gt: 0 },
        checkOutTime: { not: null },
        user: {
          payrollProfile: {
            schoolId,
            isActive: true
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
            payrollProfile: {
              select: {
                id: true,
                employeeType: true
              }
            }
          }
        }
      },
      orderBy: [
      { overtimeStatus: 'asc' },
      { overtimeHours: 'desc' },
      { date: 'asc' }]

    });

    return NextResponse.json({
      settings: {
        enableOvertime: payrollConfig.enableOvertime,
        includeOvertimeInPayroll: payrollConfig.includeOvertimeInPayroll,
        overtimeRequiresApproval: payrollConfig.overtimeRequiresApproval,
        overtimeRate: payrollConfig.overtimeRate,
        standardWorkingHours: payrollConfig.standardWorkingHours
      },
      records: records.map((record) => ({
        id: record.id,
        userId: record.userId,
        employeeId: record.user?.payrollProfile?.id,
        name: record.user?.name,
        profilePicture: record.user?.profilePicture,
        employeeType: record.user?.payrollProfile?.employeeType,
        date: record.date,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        workingHours: record.workingHours,
        overtimeHours: record.overtimeHours,
        overtimeStatus: record.overtimeStatus,
        overtimeApprovedAt: record.overtimeApprovedAt,
        overtimeApprovalRemarks: record.overtimeApprovalRemarks,
        checkoutType: record.checkoutType,
        isExtended: record.isExtended
      }))
    });
  } catch (error) {
    console.error('Payroll overtime fetch error:', error);
    return NextResponse.json({
      error: 'Failed to fetch overtime records',
      details: error.message
    }, { status: 500 });
  }
});

export const PATCH = withSchoolAccess(async function PATCH(req, props) {
  const params = await props.params;
  const { schoolId, periodId } = params;
  const { attendanceId, action, approvedBy, remarks } = await req.json();

  if (!attendanceId || !action || !['APPROVE', 'REJECT'].includes(action)) {
    return NextResponse.json({
      error: 'attendanceId and action (APPROVE/REJECT) are required'
    }, { status: 400 });
  }

  try {
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: periodId }
    });

    if (!period) {
      return NextResponse.json({ error: 'Payroll period not found' }, { status: 404 });
    }

    if (period.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId }
    });

    if (!attendance || attendance.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    if (attendance.date < period.startDate || attendance.date > period.endDate) {
      return NextResponse.json({ error: 'Attendance record is outside this payroll period' }, { status: 400 });
    }

    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        overtimeStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        overtimeApprovedBy: approvedBy || null,
        overtimeApprovedAt: new Date(),
        overtimeApprovalRemarks: remarks || null
      }
    });

    return NextResponse.json({
      success: true,
      record: updated
    });
  } catch (error) {
    console.error('Payroll overtime approval error:', error);
    return NextResponse.json({
      error: 'Failed to update overtime approval',
      details: error.message
    }, { status: 500 });
  }
});