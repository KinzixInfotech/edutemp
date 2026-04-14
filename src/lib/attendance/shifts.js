import prisma from '@/lib/prisma';
import { getDateKey } from './timezone.js';

export async function getTeacherShiftAttendanceWindow({ schoolId, userId, targetDate, timezone }) {
  const dateKey = getDateKey(targetDate, timezone);

  const shifts = await prisma.teacherShift.findMany({
    where: {
      schoolId,
      teacherId: userId,
      status: { not: 'CANCELLED' },
      date: new Date(`${dateKey}T00:00:00.000Z`),
    },
    include: {
      timeSlot: {
        select: { startTime: true, endTime: true, label: true },
      },
    },
    orderBy: {
      timeSlot: { startTime: 'asc' },
    },
  });

  if (!shifts.length) {
    return null;
  }

  const startTime = shifts[0].timeSlot.startTime;
  const endTime = shifts[shifts.length - 1].timeSlot.endTime;

  return {
    source: 'TEACHER_SHIFT',
    defaultStartTime: startTime,
    defaultEndTime: endTime,
    shifts: shifts.map((shift) => ({
      id: shift.id,
      label: shift.timeSlot.label,
      startTime: shift.timeSlot.startTime,
      endTime: shift.timeSlot.endTime,
      roomNumber: shift.roomNumber,
      subjectId: shift.subjectId,
      classId: shift.classId,
      sectionId: shift.sectionId,
    })),
  };
}
