// import prisma from "@/lib/prisma";
// import { NextResponse } from "next/server";
// import z from "zod";

// const schema = z.object({
//     userIds: z.array(z.string()).nonempty(),
//     schoolId: z.string(),
//     date: z.string().optional().nullable(),   // e.g., "2025-08-26"
//     month: z.string().optional().nullable(),  // e.g., "2025-08"
// });

// export async function GET(req) {
//     try {
//         const url = new URL(req.url);
//         const rawUserIds = url.searchParams.get("userIds") || "";
//         const schoolId = url.searchParams.get("schoolId");
//         const date = url.searchParams.get("date");
//         const month = url.searchParams.get("month");

//         const userIds = rawUserIds.split(",").filter(Boolean);

//         const { userIds: validatedUserIds, schoolId: validatedSchoolId, date: validatedDate, month: validatedMonth } =
//             schema.parse({ userIds, schoolId, date, month });

//         // Verify all users belong to the school
//         const users = await prisma.user.findMany({
//             where: { id: { in: validatedUserIds }, schoolId: validatedSchoolId },
//             select: { id: true },
//         });

//         if (users.length === 0) {
//             return NextResponse.json(
//                 { error: "No valid users found in the specified school" },
//                 { status: 404 }
//             );
//         }

//         // Build where clause
//         let whereClause = { userId: { in: validatedUserIds } };

//         if (validatedDate) {
//             // Match only the DATE part, ignoring time
//             const start = new Date(`${validatedDate}T00:00:00.000Z`);
//             const end = new Date(`${validatedDate}T23:59:59.999Z`);
//             whereClause.date = { gte: start, lte: end };
//         }

//         if (validatedMonth) {
//             const start = new Date(`${validatedMonth}-01T00:00:00Z`);
//             const end = new Date(start);
//             end.setMonth(end.getMonth() + 1);
//             whereClause.date = { gte: start, lt: end };
//         }

//         // Fetch attendance
//         const attendanceRecords = await prisma.attendance.findMany({
//             where: whereClause,
//             orderBy: { date: "desc" },
//             select: {
//                 userId: true,
//                 date: true,
//                 status: true,
//                 user: { select: { profilePicture: true } },
//             },
//         });

//         return NextResponse.json({ attendanceRecords }, { status: 200 });
//     } catch (error) {
//         return NextResponse.json({ error: error.message }, { status: 400 });
//     }
// }

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import z from "zod";

const schema = z.object({
    userIds: z.array(z.string()).nonempty(),
    schoolId: z.string(),
    date: z.string().optional().nullable(),
    month: z.string().optional().nullable(),
});

export async function GET(req) {
    try {
        const url = new URL(req.url);
        const rawUserIds = url.searchParams.get("userIds") || "";
        const schoolId = url.searchParams.get("schoolId");
        const date = url.searchParams.get("date");
        const month = url.searchParams.get("month");

        const userIds = rawUserIds.split(",").filter(Boolean);

        const {
            userIds: validatedUserIds,
            schoolId: validatedSchoolId,
            date: validatedDate,
            month: validatedMonth,
        } = schema.parse({ userIds, schoolId, date, month });

        // Verify all users belong to the school
        const users = await prisma.user.findMany({
            where: { id: { in: validatedUserIds }, schoolId: validatedSchoolId },
            select: { id: true },
        });

        if (users.length === 0) {
            return NextResponse.json(
                { error: "No valid users found in the specified school" },
                { status: 404 }
            );
        }

        // Build where clause
        let whereClause = { userId: { in: validatedUserIds } };

        if (validatedDate) {
            const start = new Date(`${validatedDate}T00:00:00.000Z`);
            const end = new Date(`${validatedDate}T23:59:59.999Z`);
            whereClause.date = { gte: start, lte: end };
        }

        if (validatedMonth) {
            const start = new Date(`${validatedMonth}-01T00:00:00Z`);
            const end = new Date(start);
            end.setMonth(end.getMonth() + 1);
            whereClause.date = { gte: start, lt: end };
        }

        // Fetch attendance
        const attendanceRecords = await prisma.attendance.findMany({
            where: whereClause,
            orderBy: { date: "desc" },
            select: {
                userId: true,
                date: true,
                status: true,
                user: { select: { profilePicture: true } },
            },
        });

        return NextResponse.json({ attendanceRecords }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

// POST - Mark attendance for students
export async function POST(req) {
    try {
        const body = await req.json();
        const { userIds, schoolId, date, markedBy, attendanceData } = body;

        // Validate markedBy is a teacher
        const teacher = await prisma.user.findUnique({
            where: { id: markedBy },
            include: {
                role: true,
                teacher: true,
            },
        });

        if (!teacher || teacher.role.name !== 'TEACHING_STAFF') {
            return NextResponse.json(
                { error: "Only teachers can mark attendance" },
                { status: 403 }
            );
        }

        // Check if teacher is PRESENT for the given date
        const teacherAttendance = await prisma.attendance.findFirst({
            where: {
                userId: markedBy,
                schoolId: schoolId,
                date: {
                    gte: new Date(`${date}T00:00:00.000Z`),
                    lte: new Date(`${date}T23:59:59.999Z`),
                },
            },
            select: {
                status: true,
            },
        });

        // If teacher is not PRESENT, deny marking
        if (!teacherAttendance || teacherAttendance.status !== 'PRESENT') {
            return NextResponse.json(
                {
                    error: "Cannot mark attendance",
                    message: "You must be marked PRESENT to mark student attendance",
                    teacherStatus: teacherAttendance?.status || "NOT_MARKED",
                },
                { status: 403 }
            );
        }

        // Validate students belong to school
        const students = await prisma.user.findMany({
            where: {
                id: { in: userIds },
                schoolId: schoolId,
                role: { name: 'STUDENT' },
            },
            select: { id: true },
        });

        if (students.length === 0) {
            return NextResponse.json(
                { error: "No valid students found" },
                { status: 404 }
            );
        }

        const validUserIds = students.map((s) => s.id);

        // Check if date is a working day
        const schoolDay = await prisma.schoolCalendar.findFirst({
            where: {
                schoolId,
                date: {
                    gte: new Date(`${date}T00:00:00.000Z`),
                    lte: new Date(`${date}T23:59:59.999Z`),
                },
            },
        });

        if (schoolDay?.isHoliday || schoolDay?.dayType === 'WEEKEND') {
            return NextResponse.json(
                { error: "Cannot mark attendance on holidays or weekends" },
                { status: 400 }
            );
        }

        // Prepare attendance records
        const attendanceRecords = validUserIds.map((userId) => {
            const studentData = attendanceData.find((a) => a.userId === userId);

            return {
                userId,
                schoolId,
                date: new Date(`${date}T00:00:00.000Z`),
                status: studentData?.status || 'ABSENT',
                markedBy,
                markedAt: new Date(),
                remarks: studentData?.remarks || null,
                checkInTime: studentData?.checkInTime || null,
                checkOutTime: studentData?.checkOutTime || null,
                workingHours: studentData?.workingHours || 0,
                approvalStatus: 'NOT_REQUIRED',
            };
        });

        // Upsert attendance records (update if exists, create if not)
        const results = await Promise.all(
            attendanceRecords.map((record) =>
                prisma.attendance.upsert({
                    where: {
                        userId_schoolId_date: {
                            userId: record.userId,
                            schoolId: record.schoolId,
                            date: record.date,
                        },
                    },
                    update: {
                        status: record.status,
                        markedBy: record.markedBy,
                        markedAt: record.markedAt,
                        remarks: record.remarks,
                    },
                    create: record,
                })
            )
        );

        return NextResponse.json(
            {
                success: true,
                message: `Attendance marked for ${results.length} students`,
                markedBy: teacher.name,
                count: results.length,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Attendance marking error:", error);
        return NextResponse.json(
            {
                error: "Failed to mark attendance",
                details: error.message,
            },
            { status: 500 }
        );
    }
}

// PUT - Update attendance (only if teacher is PRESENT)
export async function PUT(req) {
    try {
        const body = await req.json();
        const { attendanceId, status, remarks, updatedBy } = body;

        // Check if updater is a teacher
        const teacher = await prisma.user.findUnique({
            where: { id: updatedBy },
            include: { role: true },
        });

        if (!teacher || teacher.role.name !== 'TEACHING_STAFF') {
            return NextResponse.json(
                { error: "Only teachers can update attendance" },
                { status: 403 }
            );
        }

        // Get the attendance record to check date
        const attendance = await prisma.attendance.findUnique({
            where: { id: attendanceId },
            select: {
                date: true,
                schoolId: true,
            },
        });

        if (!attendance) {
            return NextResponse.json(
                { error: "Attendance record not found" },
                { status: 404 }
            );
        }

        // Check teacher's attendance for that date
        const teacherAttendance = await prisma.attendance.findFirst({
            where: {
                userId: updatedBy,
                schoolId: attendance.schoolId,
                date: {
                    gte: new Date(attendance.date.toISOString().split('T')[0] + 'T00:00:00.000Z'),
                    lte: new Date(attendance.date.toISOString().split('T')[0] + 'T23:59:59.999Z'),
                },
            },
            select: { status: true },
        });

        if (!teacherAttendance || teacherAttendance.status !== 'PRESENT') {
            return NextResponse.json(
                {
                    error: "Cannot update attendance",
                    message: "You must be marked PRESENT for that day to update attendance",
                    teacherStatus: teacherAttendance?.status || "NOT_MARKED",
                },
                { status: 403 }
            );
        }

        // Update the attendance
        const updated = await prisma.attendance.update({
            where: { id: attendanceId },
            data: {
                status,
                remarks,
                markedBy: updatedBy,
                markedAt: new Date(),
            },
            include: {
                user: {
                    select: {
                        name: true,
                        student: {
                            select: {
                                admissionNo: true,
                                rollNumber: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: "Attendance updated successfully",
                attendance: updated,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Attendance update error:", error);
        return NextResponse.json(
            {
                error: "Failed to update attendance",
                details: error.message,
            },
            { status: 500 }
        );
    }
}