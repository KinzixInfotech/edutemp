import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// ===== CONFIG =====
export const DEBUG = true;

function debugLog(...args) {
    if (!DEBUG) return;
    console.log('🚨[ATTENDANCE DEBUG]----------------------------------------------------------------');
    console.log(...args);
    console.log('🚨[ATTENDANCE DEBUG]----------------------------------------------------------------');
}

// DEAD SIMPLE: Just append time to the date string
export const ISTDate = (input) => {
    if (!input) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    }

    // If input is YYYY-MM-DD, just append time
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        return new Date(`${input}T00:00:00.000Z`);
    }

    // Otherwise parse normally
    const d = new Date(input);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

const getNextDay = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d;
}

const toInt = (v) => (typeof v === 'number' ? v : parseInt(v, 10));

// GET - Fetch students for bulk marking
export async function GET(req, props) {
  const params = await props.params;
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
        debugLog('GET /attendance/bulk called', {
            schoolId,
            classId,
            sectionId,
            dateParam,
            parsedDate: date.toISOString(),
            dateOnly: date.toISOString().split('T')[0]
        });

        // Get students in class/section
        const students = await prisma.student.findMany({
            where: {
                schoolId,
                classId: toInt(classId),
                ...(sectionId && sectionId !== 'all' && { sectionId: toInt(sectionId) }),
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
                            where: {
                                date: {
                                    gte: date,
                                    lt: getNextDay(date)
                                }
                            },
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
                ...(sectionId && sectionId !== 'all' && { sectionId: toInt(sectionId) }),
                date: {
                    gte: date,
                    lt: getNextDay(date)
                }
            },
            include: { marker: { select: { name: true } } }
        });

        // Format response
        const studentsWithAttendance = students.map(student => ({
            userId: student.userId,
            name: student.name,
            admissionNo: student.admissionNo,
            rollNumber: student.rollNumber,
            className: student.class?.className,
            sectionName: student.section?.name,
            attendance: student.user.attendance[0] || null,
            isMarked: !!student.user.attendance[0],
        }));

        debugLog('Students fetched:', {
            total: students.length,
            marked: studentsWithAttendance.filter(s => s.isMarked).length
        });

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
// POST - Submit bulk attendance (UPDATED)
export async function POST(req, props) {
  const params = await props.params;
  const { schoolId } = params;
  const body = await req.json();
  const {
    classId,
    sectionId,
    date,
    attendance,
    markedBy,
    remarks,
    markAllPresent = false,
    delegationId = null // NEW: Track if this is delegation-based marking
  } = body;

  debugLog('🔴 POST REQUEST RECEIVED', {
    schoolId,
    classId,
    sectionId,
    date,
    markedBy,
    attendanceCount: attendance?.length,
    markAllPresent,
    delegationId,
    fullBody: body
  });

  if (!classId || !date || !markedBy) {
    debugLog('❌ VALIDATION FAILED: Missing required fields');
    return NextResponse.json({
      error: 'classId, date, and markedBy are required'
    }, { status: 400 });
  }

  try {
    const attendanceDate = ISTDate(date);
    const nextDay = getNextDay(attendanceDate);
    
    debugLog('📅 PARSED DATE', {
      rawDate: date,
      parsedDate: attendanceDate.toISOString(),
      nextDay: nextDay.toISOString(),
      dateOnly: attendanceDate.toISOString().split('T')[0]
    });
    
    // ✅ STEP 1: Validate teacher exists
    debugLog('👤 STEP 1: Fetching teacher from database...');
    const teacher = await prisma.user.findUnique({
      where: { id: markedBy },
      include: { 
        role: true,
        teacher: true 
      }
    });

    debugLog('👤 TEACHER FETCH RESULT', {
      teacherFound: !!teacher,
      teacherId: markedBy,
      teacherName: teacher?.name || 'NOT FOUND',
      roleName: teacher?.role?.name || 'NO ROLE'
    });

    if (!teacher) {
      debugLog('❌ TEACHER NOT FOUND IN DATABASE');
      return NextResponse.json(
        { 
          error: "Teacher not found",
          providedUserId: markedBy
        },
        { status: 404 }
      );
    }

    if (teacher.role.name !== 'TEACHING_STAFF') {
      debugLog('❌ USER IS NOT A TEACHER', { roleName: teacher.role.name });
      return NextResponse.json(
        { 
          error: "Only teachers can mark attendance",
          providedUserId: markedBy,
          actualRole: teacher.role.name
        },
        { status: 403 }
      );
    }

    debugLog('✅ TEACHER VALIDATED SUCCESSFULLY');

    // ✅ STEP 2: Check teacher attendance OR valid delegation
    debugLog('📋 STEP 2: Checking authorization...');
    
    let isDelegated = false;
    let activeDelegation = null;

    // Check if marking via delegation
    if (delegationId) {
      activeDelegation = await prisma.attendanceDelegation.findFirst({
        where: {
          id: delegationId,
          schoolId,
          substituteTeacherId: markedBy,
          classId: toInt(classId),
          ...(sectionId && sectionId !== 'all' && { sectionId: toInt(sectionId) }),
          status: 'ACTIVE',
          startDate: { lte: attendanceDate },
          endDate: { gte: attendanceDate }
        }
      });

      if (!activeDelegation) {
        return NextResponse.json({
          error: 'Invalid delegation',
          message: 'You are not authorized to mark attendance for this class on this date'
        }, { status: 403 });
      }

      isDelegated = true;
      debugLog('✅ VALID DELEGATION FOUND', { delegationId });
    }

    // If not delegated, check teacher's own attendance
    if (!isDelegated) {
      const teacherAttendance = await prisma.attendance.findFirst({
        where: {
          userId: markedBy,
          schoolId: schoolId,
          date: {
            gte: attendanceDate,
            lt: nextDay
          }
        },
        select: {
          id: true,
          status: true,
          checkInTime: true,
          markedAt: true
        },
      });

      debugLog('📋 TEACHER ATTENDANCE QUERY RESULT', {
        found: !!teacherAttendance,
        teacherId: markedBy,
        teacherName: teacher.name,
        status: teacherAttendance?.status || 'NOT_MARKED'
      });

      if (!teacherAttendance) {
        return NextResponse.json({
          error: "Cannot mark attendance",
          message: `⚠️ You cannot mark attendance because you are not marked as PRESENT for ${attendanceDate.toISOString().split('T')[0]}. Please ensure your attendance is marked first.`,
          teacherStatus: "NOT_MARKED",
          teacherName: teacher.name,
          date: attendanceDate.toISOString().split('T')[0]
        }, { status: 403 });
      }

      if (teacherAttendance.status !== 'PRESENT') {
        return NextResponse.json({
          error: "Cannot mark attendance",
          message: `⚠️ You cannot mark student attendance because you are marked as ${teacherAttendance.status} for ${attendanceDate.toISOString().split('T')[0]}.`,
          teacherStatus: teacherAttendance.status,
          teacherName: teacher.name,
          date: attendanceDate.toISOString().split('T')[0]
        }, { status: 403 });
      }
    }

    debugLog('✅ AUTHORIZATION COMPLETE - PROCEEDING WITH MARKING', {
      isDelegated,
      delegationId: activeDelegation?.id || null
    });

    const today = ISTDate();
    const requiresApproval = attendanceDate < today;

    const config = await prisma.attendanceConfig.findUnique({ where: { schoolId } });

    const results = { success: [], failed: [], skipped: [] };
    let providedAttendance = Array.isArray(attendance) ? attendance : [];

    await prisma.$transaction(async (tx) => {
      // If markAllPresent, get all students
      let attendanceData = providedAttendance;

      if (markAllPresent) {
        const students = await tx.student.findMany({
          where: {
            schoolId,
            classId: toInt(classId),
            ...(sectionId && sectionId !== 'all' && { sectionId: toInt(sectionId) }),
            user: { deletedAt: null, status: 'ACTIVE' }
          },
          select: { userId: true }
        });

        attendanceData = students.map(s => ({ userId: s.userId, status: 'PRESENT' }));
        debugLog('markAllPresent -> created attendanceData', { count: attendanceData.length });
      }

      // Check for protected status students
      const studentUserIds = attendanceData.map(a => a.userId);
      const existingAttendanceRecords = await tx.attendance.findMany({
        where: {
          userId: { in: studentUserIds },
          schoolId,
          date: { gte: attendanceDate, lt: nextDay }
        },
        select: { 
          userId: true, 
          status: true,
          user: { select: { name: true } }
        }
      });

      const PROTECTED_STATUSES = ['ON_LEAVE', 'HALF_DAY'];
      const existingProtectedAttendance = existingAttendanceRecords.filter(record => 
        PROTECTED_STATUSES.includes(record.status)
      );
      const protectedUserIds = existingProtectedAttendance.map(a => a.userId);

      // Bulk upsert attendance records
      for (const record of attendanceData) {
        try {
          const existingAttendance = await tx.attendance.findFirst({
            where: {
              userId: record.userId,
              schoolId,
              date: { gte: attendanceDate, lt: nextDay }
            }
          });

          // Skip protected statuses
          if (protectedUserIds.includes(record.userId)) {
            const protectedRecord = existingProtectedAttendance.find(a => a.userId === record.userId);
            results.skipped.push({ 
              userId: record.userId, 
              reason: `Already marked as ${protectedRecord.status}`,
              studentName: protectedRecord.user.name
            });
            continue;
          }

          if (existingAttendance && !record.forceUpdate) {
            results.skipped.push({ userId: record.userId, reason: 'Already marked' });
            continue;
          }

          const attendancePayload = {
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
            delegationId: activeDelegation?.id || null // NEW: Track delegation
          };

          if (existingAttendance) {
            await tx.attendance.update({
              where: { id: existingAttendance.id },
              data: attendancePayload
            });
          } else {
            await tx.attendance.create({
              data: {
                userId: record.userId,
                schoolId,
                date: attendanceDate,
                ...attendancePayload
              }
            });
          }

          results.success.push(record.userId);
        } catch (error) {
          console.error('Error marking attendance for user:', record.userId, error);
          results.failed.push({ userId: record.userId, error: error.message });
        }
      }

      // Create bulk attendance record
      const statusCounts = attendanceData.reduce((acc, r) => {
        if (!protectedUserIds.includes(r.userId)) {
          acc[r.status] = (acc[r.status] || 0) + 1;
        }
        return acc;
      }, {});

      await tx.bulkAttendance.create({
        data: {
          schoolId,
          classId: toInt(classId),
          sectionId: sectionId && sectionId !== 'all' ? toInt(sectionId) : null,
          date: attendanceDate,
          markedBy,
          totalStudents: results.success.length,
          presentCount: statusCounts.PRESENT || 0,
          absentCount: statusCounts.ABSENT || 0,
          lateCount: statusCounts.LATE || 0,
          halfDayCount: statusCounts.HALF_DAY || 0,
          remarks: isDelegated ? `Marked by substitute teacher (${teacher.name})` : remarks
        }
      });

      debugLog('Transaction complete', {
        successCount: results.success.length,
        skippedCount: results.skipped.length,
        failedCount: results.failed.length
      });
    });

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: providedAttendance.length || (markAllPresent ? results.success.length : 0),
        successful: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
      },
      requiresApproval,
      teacherName: teacher.name,
      isDelegated,
      delegationInfo: isDelegated ? {
        id: activeDelegation.id,
        originalTeacherId: activeDelegation.originalTeacherId,
        startDate: activeDelegation.startDate,
        endDate: activeDelegation.endDate
      } : null
    });

  } catch (error) {
    console.error('Bulk attendance error:', error);
    return NextResponse.json({
      error: 'Failed to mark attendance',
      details: error.message
    }, { status: 500 });
  }
}
// POST - Submit bulk attendance
// export async function POST(req, props) {
  const params = await props.params;
//     const { schoolId } = params;
//     const body = await req.json();
//     const {
//         classId,
//         sectionId,
//         date,
//         attendance,
//         markedBy,
//         remarks,
//         markAllPresent = false
//     } = body;

//     debugLog('🔴 POST REQUEST RECEIVED', {
//         schoolId,
//         classId,
//         sectionId,
//         date,
//         markedBy,
//         attendanceCount: attendance?.length,
//         markAllPresent,
//         fullBody: body
//     });

//     if (!classId || !date || !markedBy) {
//         debugLog('❌ VALIDATION FAILED: Missing required fields');
//         return NextResponse.json({
//             error: 'classId, date, and markedBy are required'
//         }, { status: 400 });
//     }

//     try {
//         const attendanceDate = ISTDate(date);
//         const nextDay = getNextDay(attendanceDate);

//         debugLog('📅 PARSED DATE', {
//             rawDate: date,
//             parsedDate: attendanceDate.toISOString(),
//             nextDay: nextDay.toISOString(),
//             dateOnly: attendanceDate.toISOString().split('T')[0]
//         });

//         // ✅ STEP 1: Validate teacher exists and is TEACHING_STAFF
//         debugLog('👤 STEP 1: Fetching teacher from database...');
//         const teacher = await prisma.user.findUnique({
//             where: { id: markedBy },
//             include: {
//                 role: true,
//                 teacher: true
//             }
//         });

//         debugLog('👤 TEACHER FETCH RESULT', {
//             teacherFound: !!teacher,
//             teacherId: markedBy,
//             teacherName: teacher?.name || 'NOT FOUND',
//             roleName: teacher?.role?.name || 'NO ROLE'
//         });

//         if (!teacher) {
//             debugLog('❌ TEACHER NOT FOUND IN DATABASE');
//             return NextResponse.json(
//                 {
//                     error: "Teacher not found",
//                     providedUserId: markedBy
//                 },
//                 { status: 404 }
//             );
//         }

//         if (teacher.role.name !== 'TEACHING_STAFF') {
//             debugLog('❌ USER IS NOT A TEACHER', { roleName: teacher.role.name });
//             return NextResponse.json(
//                 {
//                     error: "Only teachers can mark attendance",
//                     providedUserId: markedBy,
//                     actualRole: teacher.role.name
//                 },
//                 { status: 403 }
//             );
//         }

//         debugLog('✅ TEACHER VALIDATED SUCCESSFULLY');

//         // ✅ STEP 2: Check if teacher is PRESENT for the given date
//         debugLog('📋 STEP 2: Checking teacher attendance status...');
//         const teacherAttendance = await prisma.attendance.findFirst({
//             where: {
//                 userId: markedBy,
//                 schoolId: schoolId,
//                 date: {
//                     gte: attendanceDate,
//                     lt: nextDay
//                 }
//             },
//             select: {
//                 id: true,
//                 status: true,
//                 checkInTime: true,
//                 markedAt: true
//             },
//         });

//         debugLog('📋 TEACHER ATTENDANCE QUERY RESULT', {
//             found: !!teacherAttendance,
//             teacherId: markedBy,
//             teacherName: teacher.name,
//             schoolId: schoolId,
//             dateRange: {
//                 gte: attendanceDate.toISOString(),
//                 lt: nextDay.toISOString()
//             },
//             attendanceRecord: teacherAttendance || 'NO RECORD FOUND',
//             status: teacherAttendance?.status || 'NOT_MARKED',
//             checkInTime: teacherAttendance?.checkInTime || 'NULL',
//             markedAt: teacherAttendance?.markedAt || 'NULL'
//         });

//         // ✅ STEP 3: Validate teacher status
//         debugLog('🚦 STEP 3: Validating teacher status...');

//         if (!teacherAttendance) {
//             debugLog('❌ BLOCKING: Teacher has NO attendance record for this date');
//             return NextResponse.json(
//                 {
//                     success: false,
//                     error: "Cannot mark attendance",
//                     message: `⚠️ You cannot mark attendance because you are not marked as PRESENT for ${attendanceDate.toISOString().split('T')[0]}. Please ensure your attendance is marked first.`,
//                     teacherStatus: "NOT_MARKED",
//                     teacherName: teacher.name,
//                     date: attendanceDate.toISOString().split('T')[0],
//                     alert: `Cannot mark attendance - You are NOT MARKED for today`,
//                     debug: {
//                         teacherId: markedBy,
//                         schoolId: schoolId,
//                         checkedDate: attendanceDate.toISOString()
//                     }
//                 },
//                 { status: 403 }
//             );
//         }

//         if (teacherAttendance.status !== 'PRESENT') {
//             debugLog('❌ BLOCKING: Teacher status is NOT PRESENT', {
//                 actualStatus: teacherAttendance.status,
//                 required: 'PRESENT'
//             });
//             return NextResponse.json(
//                 {
//                     success: false,
//                     error: "Cannot mark attendance",
//                     message: `⚠️ You cannot mark student attendance because you are marked as ${teacherAttendance.status} for ${attendanceDate.toISOString().split('T')[0]}. Only teachers marked PRESENT can mark student attendance.`,
//                     teacherStatus: teacherAttendance.status,
//                     teacherName: teacher.name,
//                     date: attendanceDate.toISOString().split('T')[0],
//                     alert: `Cannot mark attendance - You are ${teacherAttendance.status} today`,
//                     debug: {
//                         attendanceId: teacherAttendance.id,
//                         checkInTime: teacherAttendance.checkInTime,
//                         markedAt: teacherAttendance.markedAt
//                     }
//                 },
//                 { status: 403 }
//             );
//         }

//         debugLog('✅ TEACHER IS PRESENT - PROCEEDING WITH MARKING');

//         debugLog('POST /attendance/bulk - VALIDATION COMPLETE', {
//             schoolId,
//             classId,
//             sectionId,
//             rawDate: date,
//             attendanceDate: attendanceDate.toISOString(),
//             attendanceCount: attendance?.length,
//             markedBy,
//             teacherName: teacher.name,
//             teacherStatus: teacherAttendance.status,
//             markAllPresent
//         });

//         const today = ISTDate();
//         const requiresApproval = attendanceDate < today;

//         const config = await prisma.attendanceConfig.findUnique({ where: { schoolId } });
//         debugLog('attendanceConfig', config);

//         const results = { success: [], failed: [], skipped: [] };
//         let providedAttendance = Array.isArray(attendance) ? attendance : [];

//         await prisma.$transaction(async (tx) => {
//             // If markAllPresent, get all students
//             let attendanceData = providedAttendance;

//             if (markAllPresent) {
//                 const students = await tx.student.findMany({
//                     where: {
//                         schoolId,
//                         classId: toInt(classId),
//                         ...(sectionId && sectionId !== 'all' && { sectionId: toInt(sectionId) }),
//                         user: { deletedAt: null, status: 'ACTIVE' }
//                     },
//                     select: { userId: true }
//                 });

//                 attendanceData = students.map(s => ({ userId: s.userId, status: 'PRESENT' }));
//                 debugLog('markAllPresent -> created attendanceData', { count: attendanceData.length });
//             }

//             // ✅ ADDED: Check for students with protected status
//             const studentUserIds = attendanceData.map(a => a.userId);
//             const existingAttendanceRecords = await tx.attendance.findMany({
//                 where: {
//                     userId: { in: studentUserIds },
//                     schoolId,
//                     date: {
//                         gte: attendanceDate,
//                         lt: nextDay
//                     }
//                 },
//                 select: {
//                     userId: true,
//                     status: true,
//                     user: { select: { name: true } }
//                 }
//             });

//             // Define protected statuses (based on your schema)
//             const PROTECTED_STATUSES = ['ON_LEAVE', 'HALF_DAY'];

//             const existingProtectedAttendance = existingAttendanceRecords.filter(record =>
//                 PROTECTED_STATUSES.includes(record.status)
//             );

//             const protectedUserIds = existingProtectedAttendance.map(a => a.userId);

//             if (protectedUserIds.length > 0) {
//                 debugLog('Students with protected status found:', {
//                     count: protectedUserIds.length,
//                     students: existingProtectedAttendance.map(a => ({
//                         name: a.user.name,
//                         status: a.status
//                     }))
//                 });
//             }

//             // Bulk upsert attendance records
//             for (const record of attendanceData) {
//                 try {
//                     const existingAttendance = await tx.attendance.findFirst({
//                         where: {
//                             userId: record.userId,
//                             schoolId,
//                             date: {
//                                 gte: attendanceDate,
//                                 lt: nextDay
//                             }
//                         }
//                     });

//                     // ✅ ADDED: Skip students with protected status
//                     if (protectedUserIds.includes(record.userId)) {
//                         const protectedRecord = existingProtectedAttendance.find(a => a.userId === record.userId);
//                         results.skipped.push({
//                             userId: record.userId,
//                             reason: `Already marked as ${protectedRecord.status}`,
//                             studentName: protectedRecord.user.name
//                         });
//                         continue;
//                     }

//                     if (existingAttendance && !record.forceUpdate) {
//                         results.skipped.push({ userId: record.userId, reason: 'Already marked' });
//                         continue;
//                     }

//                     if (existingAttendance) {
//                         // Update existing
//                         await tx.attendance.update({
//                             where: { id: existingAttendance.id },
//                             data: {
//                                 status: record.status,
//                                 checkInTime: record.checkInTime || null,
//                                 checkOutTime: record.checkOutTime || null,
//                                 remarks: record.remarks || null,
//                                 isLateCheckIn: record.isLateCheckIn || false,
//                                 lateByMinutes: record.lateByMinutes || null,
//                                 markedBy,
//                                 markedAt: new Date(),
//                                 requiresApproval,
//                                 approvalStatus: requiresApproval ? 'PENDING' : 'NOT_REQUIRED',
//                             }
//                         });
//                     } else {
//                         // Create new
//                         await tx.attendance.create({
//                             data: {
//                                 userId: record.userId,
//                                 schoolId,
//                                 date: attendanceDate,
//                                 status: record.status,
//                                 checkInTime: record.checkInTime || null,
//                                 checkOutTime: record.checkOutTime || null,
//                                 remarks: record.remarks || null,
//                                 isLateCheckIn: record.isLateCheckIn || false,
//                                 lateByMinutes: record.lateByMinutes || null,
//                                 markedBy,
//                                 requiresApproval,
//                                 approvalStatus: requiresApproval ? 'PENDING' : 'NOT_REQUIRED',
//                             }
//                         });
//                     }

//                     results.success.push(record.userId);
//                 } catch (error) {
//                     console.error('Error marking attendance for user:', record.userId, error);
//                     results.failed.push({ userId: record.userId, error: error.message });
//                 }
//             }

//             // Create bulk attendance record
//             const statusCounts = attendanceData.reduce((acc, r) => {
//                 if (!protectedUserIds.includes(r.userId)) {
//                     acc[r.status] = (acc[r.status] || 0) + 1;
//                 }
//                 return acc;
//             }, {});

//             await tx.bulkAttendance.create({
//                 data: {
//                     schoolId,
//                     classId: toInt(classId),
//                     sectionId: sectionId && sectionId !== 'all' ? toInt(sectionId) : null,
//                     date: attendanceDate,
//                     markedBy,
//                     totalStudents: results.success.length,
//                     presentCount: statusCounts.PRESENT || 0,
//                     absentCount: statusCounts.ABSENT || 0,
//                     lateCount: statusCounts.LATE || 0,
//                     halfDayCount: statusCounts.HALF_DAY || 0,
//                     remarks,
//                 }
//             });

//             debugLog('Transaction complete', {
//                 successCount: results.success.length,
//                 skippedCount: results.skipped.length,
//                 failedCount: results.failed.length
//             });
//         });

//         // Update stats outside transaction
//         try {
//             await updateAttendanceStats(prisma, schoolId, attendanceDate);
//         } catch (err) {
//             console.error('Attendance stats update error:', err);
//         }

//         return NextResponse.json({
//             success: true,
//             results,
//             summary: {
//                 total: providedAttendance.length || (markAllPresent ? results.success.length : 0),
//                 successful: results.success.length,
//                 failed: results.failed.length,
//                 skipped: results.skipped.length,
//             },
//             requiresApproval,
//             teacherName: teacher.name,
//         });

//     } catch (error) {
//         console.error('Bulk attendance error:', error);
//         return NextResponse.json({
//             error: 'Failed to mark attendance',
//             details: error.message
//         }, { status: 500 });
//     }
// }

// Helper function to update stats
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
            debugLog('No active academic year found');
            return;
        }

        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);

        const users = await client.attendance.groupBy({
            by: ['userId'],
            where: {
                schoolId,
                date: { gte: monthStart, lte: monthEnd }
            },
            _count: { id: true }
        });

        debugLog('Users with attendance in month:', users.length);

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
        }

    } catch (error) {
        console.error('updateAttendanceStats error:', error);
        throw error;
    }
}

// PUT - Update existing bulk attendance
export async function PUT(req, props) {
  const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { bulkId, updates, markedBy } = body;

    if (!bulkId || !updates || !markedBy) {
        return NextResponse.json({
            error: 'bulkId, updates, and markedBy are required'
        }, { status: 400 });
    }

    try {
        // ✅ ADDED: Validate teacher
        const teacher = await prisma.user.findUnique({
            where: { id: markedBy },
            include: { role: true }
        });

        if (!teacher || teacher.role.name !== 'TEACHING_STAFF') {
            return NextResponse.json(
                { error: "Only teachers can update attendance" },
                { status: 403 }
            );
        }

        // ✅ ADDED: Check teacher attendance for the date being updated
        if (updates.length > 0) {
            const updateDate = ISTDate(updates[0].date);
            const nextDay = getNextDay(updateDate);

            const teacherAttendance = await prisma.attendance.findFirst({
                where: {
                    userId: markedBy,
                    schoolId: schoolId,
                    date: {
                        gte: updateDate,
                        lt: nextDay
                    }
                },
                select: { status: true },
            });

            debugLog('Teacher attendance check (PUT)', {
                teacherId: markedBy,
                teacherName: teacher.name,
                date: updateDate.toISOString(),
                status: teacherAttendance?.status || 'NOT_MARKED'
            });

            if (!teacherAttendance || teacherAttendance.status !== 'PRESENT') {
                return NextResponse.json(
                    {
                        error: "Cannot update attendance",
                        message: "You must be marked PRESENT for that day to update attendance",
                        teacherStatus: teacherAttendance?.status || "NOT_MARKED",
                        teacherName: teacher.name
                    },
                    { status: 403 }
                );
            }
        }

        const results = { updated: [], failed: [], skipped: [] };

        await prisma.$transaction(async (tx) => {
            for (const update of updates) {
                try {
                    const attendanceDate = ISTDate(update.date);
                    const nextDay = getNextDay(attendanceDate);

                    // ✅ ADDED: Check if student has protected status
                    const existingAttendance = await tx.attendance.findFirst({
                        where: {
                            userId: update.userId,
                            schoolId,
                            date: {
                                gte: attendanceDate,
                                lt: nextDay
                            }
                        },
                        select: {
                            status: true,
                            user: { select: { name: true } }
                        }
                    });

                    // Define protected statuses
                    const PROTECTED_STATUSES = ['ON_LEAVE', 'HALF_DAY'];

                    // Skip if trying to overwrite protected status
                    if (existingAttendance &&
                        PROTECTED_STATUSES.includes(existingAttendance.status) &&
                        !update.forceUpdate) {
                        results.skipped.push({
                            userId: update.userId,
                            reason: `Cannot overwrite ${existingAttendance.status}`,
                            studentName: existingAttendance.user.name
                        });
                        continue;
                    }

                    await tx.attendance.updateMany({
                        where: {
                            userId: update.userId,
                            schoolId,
                            date: {
                                gte: attendanceDate,
                                lt: nextDay
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

        // Update stats
        if (updates.length > 0) {
            updateAttendanceStats(prisma, schoolId, ISTDate(updates[0].date)).catch(console.error);
        }

        return NextResponse.json({
            success: true,
            results,
            teacherName: teacher.name
        });

    } catch (error) {
        console.error('Update bulk attendance error:', error);
        return NextResponse.json({
            error: 'Failed to update attendance',
            details: error.message
        }, { status: 500 });
    }
}