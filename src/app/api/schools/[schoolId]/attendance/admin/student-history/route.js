// app/api/schools/[schoolId]/attendance/admin/student-history/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const studentId = searchParams.get('studentId');
    const month = searchParams.get('month')
        ? parseInt(searchParams.get('month'))
        : new Date().getMonth() + 1;
    const year = searchParams.get('year')
        ? parseInt(searchParams.get('year'))
        : new Date().getFullYear();

    if (!studentId) {
        return NextResponse.json({ error: 'studentId required' }, { status: 400 });
    }

    try {
        // Verify student exists
        const student = await prisma.student.findUnique({
            where: { userId: studentId },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        profilePicture: true
                    }
                },
                class: {
                    select: { className: true }
                },
                section: {
                    select: { name: true }
                }
            }
        });

        if (!student || student.schoolId !== schoolId) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        // Get date range for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Fetch attendance records for the month
        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                userId: studentId,
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

        // Get monthly stats
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
            select: { id: true }
        });

        const monthlyStats = await prisma.attendanceStats.findUnique({
            where: {
                userId_academicYearId_month_year: {
                    userId: studentId,
                    academicYearId: academicYear.id,
                    month,
                    year
                }
            }
        });

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
                avgWorkingHours: monthlyStats.avgWorkingHours
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
                avgWorkingHours: 0
            };
        }

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
                remarks: attendance?.remarks,
                markedBy: attendance?.marker?.name,
                leaveType: attendance?.leaveRequest?.leaveType
            });
        }

        // Get comparison with previous months
        const previousMonths = await prisma.attendanceStats.findMany({
            where: {
                userId: studentId,
                schoolId,
                academicYearId: academicYear.id,
                year
            },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ],
            take: 6
        });

        const comparisonData = previousMonths.map(m => ({
            month: m.month,
            year: m.year,
            percentage: m.attendancePercentage,
            present: m.totalPresent,
            absent: m.totalAbsent
        }));

        return NextResponse.json({
            student: {
                userId: student.userId,
                name: student.user.name,
                email: student.user.email,
                profilePicture: student.user.profilePicture,
                admissionNo: student.admissionNo,
                rollNumber: student.rollNumber,
                className: student.class.className,
                sectionName: student.section?.name,
                bloodGroup: student.bloodGroup
            },
            period: {
                month,
                year,
                monthName: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' })
            },
            stats,
            calendar: calendarData,
            records: attendanceRecords.map(r => ({
                date: r.date,
                status: r.status,
                checkInTime: r.checkInTime,
                checkOutTime: r.checkOutTime,
                workingHours: r.workingHours,
                isLateCheckIn: r.isLateCheckIn,
                lateByMinutes: r.lateByMinutes,
                remarks: r.remarks,
                markedBy: r.marker?.name,
                markedAt: r.markedAt,
                leaveType: r.leaveRequest?.leaveType,
                leaveReason: r.leaveRequest?.reason
            })),
            comparison: comparisonData
        });

    } catch (error) {
        console.error('Student history error:', error);
        return NextResponse.json({
            error: 'Failed to fetch student attendance history',
            details: error.message
        }, { status: 500 });
    }
}

// POST - Export student report
export async function POST(req, { params }) {
    const { schoolId } = params;
    const { studentId, format, startDate, endDate } = await req.json();

    if (!studentId || !format) {
        return NextResponse.json({
            error: 'studentId and format required'
        }, { status: 400 });
    }

    try {
        // Fetch student data
        const student = await prisma.student.findUnique({
            where: { userId: studentId },
            include: {
                user: { select: { name: true } },
                class: { select: { className: true } },
                section: { select: { name: true } }
            }
        });

        // Fetch attendance records
        const records = await prisma.attendance.findMany({
            where: {
                userId: studentId,
                schoolId,
                ...(startDate && endDate && {
                    date: {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    }
                })
            },
            orderBy: { date: 'asc' }
        });

        // Return data for frontend to generate PDF/Excel
        return NextResponse.json({
            success: true,
            format,
            student: {
                name: student.user.name,
                admissionNo: student.admissionNo,
                class: student.class.className,
                section: student.section?.name
            },
            records: records.map(r => ({
                date: r.date.toLocaleDateString('en-IN'),
                status: r.status,
                checkIn: r.checkInTime?.toLocaleTimeString('en-IN'),
                checkOut: r.checkOutTime?.toLocaleTimeString('en-IN'),
                hours: r.workingHours,
                remarks: r.remarks
            }))
        });

    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({
            error: 'Failed to export report'
        }, { status: 500 });
    }
}