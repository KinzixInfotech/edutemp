import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from "@/lib/cache";

// GET /api/schools/[schoolId]/timetable/view/class/[classId]
export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  try {
    const { schoolId, classId } = params;
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get('sectionId');

    const cacheKey = generateKey('timetable:view:class', { schoolId, classId, sectionId });

    const timetableData = await remember(cacheKey, async () => {
      // Fetch class + section + school info in parallel with timetable data
      const [timeSlots, entries, classInfo, schoolInfo] = await Promise.all([
      prisma.timeSlot.findMany({
        where: { schoolId },
        orderBy: { sequence: 'asc' }
      }),
      prisma.timetableEntry.findMany({
        where: {
          schoolId,
          classId: parseInt(classId),
          ...(sectionId && { sectionId: parseInt(sectionId) }),
          isActive: true
        },
        include: {
          subject: {
            select: { id: true, subjectName: true, subjectCode: true }
          },
          teacher: {
            select: { userId: true, name: true }
          },
          section: {
            select: { id: true, name: true }
          },
          timeSlot: {
            select: { id: true, label: true, startTime: true, endTime: true, sequence: true, isBreak: true }
          }
        },
        orderBy: [
        { dayOfWeek: 'asc' },
        { timeSlot: { sequence: 'asc' } }]

      }),
      prisma.class.findUnique({
        where: { id: parseInt(classId) },
        select: {
          id: true,
          className: true,
          sections: {
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
          }
        }
      }),
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true, profilePicture: true }
      })]
      );

      // Get unique sections from entries
      const sectionsInTimetable = [];
      const seenSections = new Set();
      entries.forEach((entry) => {
        if (entry.section && !seenSections.has(entry.section.id)) {
          seenSections.add(entry.section.id);
          sectionsInTimetable.push(entry.section);
        }
      });

      // Organize by day and time slot
      const timetable = {
        1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}
      };

      entries.forEach((entry) => {
        if (!timetable[entry.dayOfWeek]) {
          timetable[entry.dayOfWeek] = {};
        }
        timetable[entry.dayOfWeek][entry.timeSlotId] = {
          id: entry.id,
          subject: entry.subject,
          teacher: entry.teacher,
          section: entry.section,
          roomNumber: entry.roomNumber,
          notes: entry.notes
        };
      });

      // Find selected section name
      const selectedSection = sectionId ?
      classInfo?.sections?.find((s) => s.id === parseInt(sectionId)) :
      null;

      return {
        timeSlots,
        timetable,
        classId: parseInt(classId),
        sectionId: sectionId ? parseInt(sectionId) : null,
        className: classInfo?.className || '',
        sectionName: selectedSection?.name || null,
        sections: classInfo?.sections || [],
        sectionsInTimetable,
        schoolName: schoolInfo?.name || '',
        schoolLogo: schoolInfo?.profilePicture || null,
        totalEntries: entries.length
      };
    }, 300);

    return NextResponse.json(timetableData);
  } catch (error) {
    console.error('Error fetching class timetable:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class timetable' },
      { status: 500 }
    );
  }
});