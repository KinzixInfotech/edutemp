import prisma from "@/lib/prisma";

/**
 * StudentSession Helpers
 * 
 * Centralized utilities for querying student sessions.
 * Use these instead of directly querying Student.classId etc.
 */

/**
 * Get the current ACTIVE session for a student.
 * Fast path: uses Student.currentSessionId pointer.
 * Fallback: queries StudentSession where status = ACTIVE.
 */
export async function getCurrentSession(studentId) {
    // Fast path via pointer
    const student = await prisma.student.findUnique({
        where: { userId: studentId },
        select: {
            currentSessionId: true,
            currentSession: {
                select: {
                    id: true,
                    academicYearId: true,
                    classId: true,
                    sectionId: true,
                    rollNumber: true,
                    status: true,
                    joinedAt: true,
                },
            },
        },
    });

    if (student?.currentSession) return student.currentSession;

    // Fallback: query directly
    return prisma.studentSession.findFirst({
        where: { studentId, status: "ACTIVE" },
        orderBy: { joinedAt: "desc" },
    });
}

/**
 * Get session for a specific academic year.
 * Returns the student's enrollment record for that year.
 */
export async function getSessionByYear(studentId, academicYearId) {
    return prisma.studentSession.findUnique({
        where: {
            studentId_academicYearId: { studentId, academicYearId },
        },
    });
}

/**
 * Get all sessions for a student (full history).
 * Ordered by joinedAt descending (newest first).
 */
export async function getStudentHistory(studentId) {
    return prisma.studentSession.findMany({
        where: { studentId },
        include: {
            academicYear: { select: { id: true, name: true, startDate: true, endDate: true } },
            class: { select: { id: true, className: true } },
            section: { select: { id: true, name: true } },
        },
        orderBy: { joinedAt: "desc" },
    });
}

/**
 * Ensure only one ACTIVE session exists per student.
 * Deactivates all other ACTIVE sessions before creating new one.
 * Call this before creating a new ACTIVE session.
 */
export async function deactivateOtherSessions(studentId, excludeYearId = null) {
    const where = {
        studentId,
        status: "ACTIVE",
    };
    if (excludeYearId) {
        where.NOT = { academicYearId: excludeYearId };
    }

    return prisma.studentSession.updateMany({
        where,
        data: {
            status: "PROMOTED",
            leftAt: new Date(),
        },
    });
}
