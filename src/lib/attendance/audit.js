import prisma from '@/lib/prisma';

export async function createAttendanceAuditLog({
  userId,
  action,
  schoolId,
  attendanceId,
  payload,
  error,
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: error ? 'ERROR' : attendanceId ? 'UPDATE' : 'CREATE',
        tableName: 'Attendance',
        rowId: attendanceId || `${schoolId}:${action}:${userId || 'unknown'}`,
        newData: payload ?? null,
        error: error ?? null,
      },
    });
  } catch (auditError) {
    console.error('[attendance-audit] failed to write audit log', auditError);
  }
}

