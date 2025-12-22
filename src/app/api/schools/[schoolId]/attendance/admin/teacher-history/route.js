// app/api/schools/[schoolId]/attendance/admin/teacher-history/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const teacherId = searchParams.get('teacherId');
    const month = searchParams.get('month')
        ? parseInt(searchParams.get('month'))
        : new Date().getMonth() + 1;
    const year = searchParams.get('year')
        ? parseInt(searchParams.get('year'))
        : new Date().getFullYear();

    if (!teacherId) {
        return NextResponse.json({ error: 'teacherId required' }, { status: 400 });
    }

    try {
        // Get teacher details
        const teacher = await prisma.teachingStaff.findUnique({
            where: { userId: teacherId },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        profilePicture: true,
                    }
                },
                department: {
                    select: { name: true }
                }
            }
        });

        if (!teacher || teacher.schoolId !== schoolId) {
            return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
        }

        // Get date range for the month
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 0));

        // Fetch attendance records for the month
        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                userId: teacherId,
                schoolId,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                marker: {
                    select: { name: true }
                },
                leaveRequest: {
                    select: {
                        leaveType: true,
                        reason: true
                    }
                }
            },
            orderBy: { date: 'asc' }
        });

        // Get academic year for leave balance
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
            select: { id: true }
        });

        // Get monthly stats
        const monthlyStats = academicYear ? await prisma.attendanceStats.findUnique({
            where: {
                userId_academicYearId_month_year: {
                    userId: teacherId,
                    academicYearId: academicYear.id,
                    month,
                    year
                }
            }
        }) : null;

        // Get leave balance
        const leaveBalance = academicYear ? await prisma.leaveBalance.findUnique({
            where: {
                userId_academicYearId: {
                    userId: teacherId,
                    academicYearId: academicYear.id
                }
            }
        }) : null;

        // Calculate streak
        const streak = await calculateStreak(teacherId, schoolId);

        // Calculate stats if not found
        let stats;
        if (monthlyStats) {
            stats = {
                totalWorkingDays: monthlyStats.totalWorkingDays,
                totalPresent: monthlyStats.totalPresent,
                totalAbsent: monthlyStats.totalAbsent,
                totalLate: monthlyStats.totalLate,
                totalHalfDay: monthlyStats.totalHalfDay,
                totalLeaves: monthlyStats.totalLeaves,
                attendancePercentage: monthlyStats.attendancePercentage,
                avgWorkingHours: monthlyStats.avgWorkingHours,
                streak
            };
        } else {
            // Calculate from records
            const present = attendanceRecords.filter(r => r.status === 'PRESENT').length;
            const absent = attendanceRecords.filter(r => r.status === 'ABSENT').length;
            const late = attendanceRecords.filter(r => r.status === 'LATE').length;
            const halfDay = attendanceRecords.filter(r => r.status === 'HALF_DAY').length;
            const leaves = attendanceRecords.filter(r => r.status === 'ON_LEAVE').length;

            const totalDays = present + absent + late + halfDay + leaves;
            const percentage = totalDays > 0
                ? ((present + late + (halfDay * 0.5)) / totalDays) * 100
                : 0;

            stats = {
                totalWorkingDays: totalDays,
                totalPresent: present,
                totalAbsent: absent,
                totalLate: late,
                totalHalfDay: halfDay,
                totalLeaves: leaves,
                attendancePercentage: Number(percentage.toFixed(2)),
                avgWorkingHours: 0,
                streak
            };
        }

        // Format leave balance
        const leaves = leaveBalance ? {
            casual: {
                total: leaveBalance.casualLeaveTotal,
                used: leaveBalance.casualLeaveUsed,
                balance: leaveBalance.casualLeaveBalance
            },
            sick: {
                total: leaveBalance.sickLeaveTotal,
                used: leaveBalance.sickLeaveUsed,
                balance: leaveBalance.sickLeaveBalance
            },
            earned: {
                total: leaveBalance.earnedLeaveTotal,
                used: leaveBalance.earnedLeaveUsed,
                balance: leaveBalance.earnedLeaveBalance
            },
            maternity: {
                total: leaveBalance.maternityLeaveTotal,
                used: leaveBalance.maternityLeaveUsed,
                balance: leaveBalance.maternityLeaveBalance
            }
        } : null;

        // Get working days from calendar
        const workingDays = await prisma.schoolCalendar.findMany({
            where: {
                schoolId,
                date: {
                    gte: startDate,
                    lte: endDate
                },
                dayType: 'WORKING_DAY'
            },
            select: { date: true }
        });

        // Create calendar view data
        const calendarData = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const attendance = attendanceRecords.find(r =>
                r.date.toISOString().split('T')[0] === dateStr
            );

            const isWorkingDay = workingDays.some(wd =>
                wd.date.toISOString().split('T')[0] === dateStr
            );

            calendarData.push({
                date: dateStr,
                day: d.getDate(),
                dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
                status: attendance?.status || null,
                isWorkingDay,
                marked: !!attendance,
                checkInTime: attendance?.checkInTime,
                checkOutTime: attendance?.checkOutTime,
                workingHours: attendance?.workingHours,
                isLateCheckIn: attendance?.isLateCheckIn,
                lateByMinutes: attendance?.lateByMinutes,
                checkInLocation: attendance?.checkInLocation,
                deviceInfo: attendance?.deviceInfo,
                remarks: attendance?.remarks,
                markedBy: attendance?.marker?.name,
                leaveType: attendance?.leaveRequest?.leaveType
            });
        }

        return NextResponse.json({
            teacher: {
                userId: teacher.userId,
                name: teacher.name,
                email: teacher.email,
                profilePicture: teacher.user?.profilePicture,
                employeeId: teacher.employeeId,
                designation: teacher.designation,
                department: teacher.department?.name,
                contactNumber: teacher.contactNumber,
            },
            period: {
                month,
                year,
                monthName: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' })
            },
            stats,
            leaves,
            calendar: calendarData,
            records: attendanceRecords.map(r => ({
                date: r.date,
                status: r.status,
                checkInTime: r.checkInTime,
                checkOutTime: r.checkOutTime,
                workingHours: r.workingHours,
                isLateCheckIn: r.isLateCheckIn,
                lateByMinutes: r.lateByMinutes,
                checkInLocation: r.checkInLocation,
                checkOutLocation: r.checkOutLocation,
                deviceInfo: r.deviceInfo,
                remarks: r.remarks,
                markedBy: r.marker?.name,
                markedAt: r.markedAt,
                leaveType: r.leaveRequest?.leaveType,
                leaveReason: r.leaveRequest?.reason
            }))
        });

    } catch (error) {
        console.error('Teacher history error:', error);
        return NextResponse.json({
            error: 'Failed to fetch teacher attendance history',
            details: error.message
        }, { status: 500 });
    }
}

// Calculate consecutive attendance streak
async function calculateStreak(userId, schoolId) {
    try {
        const records = await prisma.attendance.findMany({
            where: {
                userId,
                schoolId,
                status: { in: ['PRESENT', 'LATE'] }
            },
            orderBy: { date: 'desc' },
            take: 100,
            select: { date: true }
        });

        if (records.length === 0) return 0;

        let streak = 0;
        let expectedDate = new Date();
        expectedDate.setHours(0, 0, 0, 0);

        for (const record of records) {
            const recordDate = new Date(record.date);
            recordDate.setHours(0, 0, 0, 0);

            if (recordDate.getTime() === expectedDate.getTime()) {
                streak++;
                expectedDate.setDate(expectedDate.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    } catch (error) {
        console.error('Streak calculation error:', error);
        return 0;
    }
}
