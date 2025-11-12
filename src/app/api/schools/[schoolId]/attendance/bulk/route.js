// app/api/schools/[schoolId]/attendance/bulk/route.js
// Bulk attendance marking for teachers and admins

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// ===== CONFIG =====
// Set DEBUG = true to enable detailed, highlighted debug logs
export const DEBUG = true;

function debugLog(...args) {
    if (!DEBUG) return;
    // Prefix and visually separate debug logs so they stand out in server logs
    console.log('🚨[ATTENDANCE DEBUG]----------------------------------------------------------------');
    console.log(...args);
    console.log('🚨[ATTENDANCE DEBUG]----------------------------------------------------------------');
}
export const ISTDate = (input) => {
    if (!input) return new Date(new Date().toDateString());

    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        const [y, m, d] = input.split('-').map(Number);
        return new Date(y, m - 1, d); // local date, not UTC conversion
    }

    return new Date(input);
}


// Helper: safe parsing to integer
const toInt = (v) => (typeof v === 'number' ? v : parseInt(v, 10));

// GET - Fetch students for bulk marking
export async function GET(req, { params }) {
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const classId = searchParams.get('classId');
    const sectionId = searchParams.get('sectionId');
    const dateParam = searchParams.get('date');
    const date = dateParam ? ISTDate(dateParam) : ISTDate();

    if (!classId) {
        return NextResponse.json({ error: 'classId is required' }, { status: 400 });
    }

    try {
        debugLog('GET /attendance/bulk called', { schoolId, classId, sectionId, date: date.toISOString() });

        // Get students in class/section
        const students = await prisma.student.findMany({
            where: {
                schoolId,
                classId: toInt(classId),
                ...(sectionId && { sectionId: toInt(sectionId) }),
                user: {
                    deletedAt: null,
                    status: 'ACTIVE'
                }
            },
            select: {
                userId: true,
                name: true,
                admissionNo: true,
                rollNumber: true,
                class: { select: { className: true } },
                section: { select: { name: true } },
                user: {
                    select: {
                        attendance: {
                            where: { date: date },
                            select: {
                                id: true,
                                status: true,
                                checkInTime: true,
                                remarks: true,
                                isLateCheckIn: true,
                            }
                        }
                    }
                }
            },
            orderBy: [
                { rollNumber: 'asc' },
                { name: 'asc' }
            ]
        });

        // Check if bulk attendance already marked
        const existingBulk = await prisma.bulkAttendance.findFirst({
            where: {
                schoolId,
                classId: toInt(classId),
                ...(sectionId && { sectionId: toInt(sectionId) }),
                date: date
            },
            include: { marker: { select: { name: true } } }
        });

        // Format response
        const studentsWithAttendance = students.map(student => ({
            userId: student.userId,
            name: student.name,
            admissionNo: student.admissionNo,
            rollNumber: student.rollNumber,
            profilePicture: student.profilePicture,
            className: student.class?.className,
            sectionName: student.section?.name,
            attendance: student.user.attendance[0] || null,
            isMarked: !!student.user.attendance[0],
        }));

        return NextResponse.json({
            students: studentsWithAttendance,
            totalStudents: students.length,
            markedCount: studentsWithAttendance.filter(s => s.isMarked).length,
            existingBulk,
            date: date.toISOString(),
        });

    } catch (error) {
        console.error('Fetch students error:', error);
        return NextResponse.json({
            error: 'Failed to fetch students',
            details: error.message
        }, { status: 500 });
    }
}

// POST - Submit bulk attendance
export async function POST(req, { params }) {
    const { schoolId } = params;
    const body = await req.json();
    const {
        classId,
        sectionId,
        date,
        attendance,
        markedBy,
        remarks,
        markAllPresent = false
    } = body;

    if (!classId || !date || !markedBy) {
        return NextResponse.json({
            error: 'classId, date, and markedBy are required'
        }, { status: 400 });
    }

    try {
        console.log('🕒 Raw:', date, '| ISTDate:', ISTDate(date).toISOString(), '| Local:', ISTDate(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        const attendanceDate = ISTDate(date);
        debugLog('POST /attendance/bulk called', { schoolId, classId, sectionId, rawDate: date, attendanceDate: attendanceDate.toISOString(), markedBy, markAllPresent });

        const today = ISTDate(); // normalized today
        // Check if marking past attendance (requires approval)
        const requiresApproval = attendanceDate < today;

        // Get attendance config (could be null)
        const config = await prisma.attendanceConfig.findUnique({ where: { schoolId } });
        debugLog('attendanceConfig', config);

        const results = { success: [], failed: [], skipped: [] };

        // Ensure attendance array exists
        let providedAttendance = Array.isArray(attendance) ? attendance : [];

        // Process in transaction
        // We will commit attendance & bulkAttendance atomically, then run stats update after commit using root client.
        let attendanceData = providedAttendance;

        await prisma.$transaction(async (tx) => {
            // If markAllPresent, get all students
            if (markAllPresent) {
                const students = await tx.student.findMany({
                    where: {
                        schoolId,
                        classId: toInt(classId),
                        ...(sectionId && { sectionId: toInt(sectionId) }),
                        user: { deletedAt: null, status: 'ACTIVE' }
                    },
                    select: { userId: true }
                });

                attendanceData = students.map(s => ({ userId: s.userId, status: 'PRESENT' }));
                debugLog('markAllPresent -> created attendanceData', { count: attendanceData.length });
            }

            // Bulk upsert attendance records inside transaction
            for (const record of attendanceData) {
                try {
                    const existingAttendance = await tx.attendance.findUnique({
                        where: {
                            userId_schoolId_date: {
                                userId: record.userId,
                                schoolId,
                                date: attendanceDate
                            }
                        }
                    });

                    if (existingAttendance && !record.forceUpdate) {
                        results.skipped.push({ userId: record.userId, reason: 'Already marked' });
                        continue;
                    }

                    const attendanceRecord = await tx.attendance.upsert({
                        where: {
                            userId_schoolId_date: {
                                userId: record.userId,
                                schoolId,
                                date: attendanceDate
                            }
                        },
                        update: {
                            status: record.status,
                            checkInTime: record.checkInTime || null,
                            checkOutTime: record.checkOutTime || null,
                            remarks: record.remarks || null,
                            isLateCheckIn: record.isLateCheckIn || false,
                            lateByMinutes: record.lateByMinutes || null,
                            markedBy,
                            markedAt: new Date(),
                            requiresApproval,
                            approvalStatus: requiresApproval ? 'PENDING' : 'NOT_REQUIRED',
                        },
                        create: {
                            userId: record.userId,
                            schoolId,
                            date: attendanceDate,
                            status: record.status,
                            checkInTime: record.checkInTime || null,
                            checkOutTime: record.checkOutTime || null,
                            remarks: record.remarks || null,
                            isLateCheckIn: record.isLateCheckIn || false,
                            lateByMinutes: record.lateByMinutes || null,
                            markedBy,
                            requiresApproval,
                            approvalStatus: requiresApproval ? 'PENDING' : 'NOT_REQUIRED',
                        }
                    });

                    results.success.push(attendanceRecord.id);
                } catch (error) {
                    results.failed.push({ userId: record.userId, error: error.message });
                }
            }

            // Create bulk attendance record
            const statusCounts = attendanceData.reduce((acc, r) => {
                acc[r.status] = (acc[r.status] || 0) + 1;
                return acc;
            }, {});

            await tx.bulkAttendance.create({
                data: {
                    schoolId,
                    classId: toInt(classId),
                    sectionId: sectionId ? toInt(sectionId) : null,
                    date: attendanceDate,
                    markedBy,
                    totalStudents: attendanceData.length,
                    presentCount: statusCounts.PRESENT || 0,
                    absentCount: statusCounts.ABSENT || 0,
                    lateCount: statusCounts.LATE || 0,
                    halfDayCount: statusCounts.HALF_DAY || 0,
                    remarks,
                }
            });

            // IMPORTANT: Do NOT call updateAttendanceStats(tx, ...) here without awaiting —
            // but also avoid doing heavy stat calculation inside transaction for performance.
            // We'll run stats after the transaction commits using the root prisma client.
            debugLog('Transaction: attendance upsert & bulk created', { successCount: results.success.length, skippedCount: results.skipped.length, failedCount: results.failed.length });
        }); // end transaction

        // Now update attendance stats using the root prisma client (outside transaction)
        try {
            updateAttendanceStats(prisma, schoolId, attendanceDate);
        } catch (err) {
            // Don't fail the API if stats fail — just log
            console.error('Attendance stats update error (post-transaction):', err);
        }

        return NextResponse.json({
            success: true,
            results,
            summary: {
                total: attendanceData.length,
                successful: results.success.length,
                failed: results.failed.length,
                skipped: results.skipped.length,
            },
            requiresApproval,
        });

    } catch (error) {
        console.error('Bulk attendance error:', error);
        return NextResponse.json({
            error: 'Failed to mark attendance',
            details: error.message
        }, { status: 500 });
    }
}

// Helper function to update stats
// Accepts either a prisma client or a transaction client
async function updateAttendanceStats(client, schoolId, date) {
    try {
        debugLog('updateAttendanceStats called', { schoolId, date: date.toISOString() });

        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        const academicYear = await client.academicYear.findFirst({
            where: { schoolId, isActive: true },
            select: { id: true }
        });

        if (!academicYear) {
            debugLog('No active academic year found for school', { schoolId });
            return;
        }

        // Get all users with attendance in this month
        const monthStart = ISTDate(new Date(year, month - 1, 1));
        const monthEnd = ISTDate(new Date(year, month, 0));

        const users = await client.attendance.groupBy({
            by: ['userId'],
            where: {
                schoolId,
                date: { gte: monthStart, lte: monthEnd }
            },
            _count: { id: true }
        });

        debugLog('Users with attendance in month', { monthStart: monthStart.toISOString(), monthEnd: monthEnd.toISOString(), userCount: users.length });

        for (const user of users) {
            const stats = await client.attendance.groupBy({
                by: ['status'],
                where: {
                    userId: user.userId,
                    schoolId,
                    date: { gte: monthStart, lte: monthEnd }
                },
                _count: { id: true }
            });

            const totalPresent = stats.find(s => s.status === 'PRESENT')?._count.id || 0;
            const totalAbsent = stats.find(s => s.status === 'ABSENT')?._count.id || 0;
            const totalHalfDay = stats.find(s => s.status === 'HALF_DAY')?._count.id || 0;
            const totalLate = stats.find(s => s.status === 'LATE')?._count.id || 0;
            const totalLeaves = stats.find(s => s.status === 'ON_LEAVE')?._count.id || 0;

            const totalDays = totalPresent + totalAbsent + totalHalfDay + totalLate + totalLeaves;
            const attendancePercentage = totalDays > 0
                ? ((totalPresent + totalLate + (totalHalfDay * 0.5)) / totalDays) * 100
                : 0;

            await client.attendanceStats.upsert({
                where: {
                    userId_academicYearId_month_year: {
                        userId: user.userId,
                        academicYearId: academicYear.id,
                        month,
                        year
                    }
                },
                update: {
                    totalPresent,
                    totalAbsent,
                    totalHalfDay,
                    totalLate,
                    totalLeaves,
                    attendancePercentage,
                    lastCalculated: new Date(),
                },
                create: {
                    userId: user.userId,
                    schoolId,
                    academicYearId: academicYear.id,
                    month,
                    year,
                    totalPresent,
                    totalAbsent,
                    totalHalfDay,
                    totalLate,
                    totalLeaves,
                    attendancePercentage,
                }
            });

            debugLog('Upserted attendanceStats for user', { userId: user.userId, totalPresent, totalAbsent, totalHalfDay, totalLate, totalLeaves, attendancePercentage });
        }

    } catch (error) {
        console.error('updateAttendanceStats error:', error);
        // bubble up or swallow depending on caller — caller currently logs and continues
        throw error;
    }
}

// PUT - Update existing bulk attendance
export async function PUT(req, { params }) {
    const { schoolId } = params;
    const body = await req.json();
    const { bulkId, updates, markedBy } = body;

    if (!bulkId || !updates) {
        return NextResponse.json({ error: 'bulkId and updates are required' }, { status: 400 });
    }

    try {
        const results = { updated: [], failed: [] };

        await prisma.$transaction(async (tx) => {
            for (const update of updates) {
                try {
                    await tx.attendance.update({
                        where: {
                            userId_schoolId_date: {
                                userId: update.userId,
                                schoolId,
                                date: ISTDate(update.date)
                            }
                        },
                        data: {
                            status: update.status,
                            remarks: update.remarks,
                            markedBy,
                            markedAt: new Date(),
                        }
                    });

                    results.updated.push(update.userId);
                } catch (error) {
                    results.failed.push({ userId: update.userId, error: error.message });
                }
            }
        });

        // Optionally update stats after bulk update (uncomment if desired)
        updateAttendanceStats(prisma, schoolId, ISTDate(updates[0].date)).catch(console.error);

        return NextResponse.json({ success: true, results });

    } catch (error) {
        console.error('Update bulk attendance error:', error);
        return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 });
    }
}
