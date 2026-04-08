const { PrismaClient } = require('./src/app/generated/prisma');
const prisma = new PrismaClient();

const CLASS_TABLES = [
  { table: '"Assignment"', column: '"classId"' },
  { table: '"Syllabus"', column: '"classId"' },
  { table: '"NoticeTarget"', column: '"classId"' },
  { table: '"Student"', column: '"classId"' },
  { table: '"StudentSession"', column: '"classId"' },
  { table: '"TimetableEntry"', column: '"classId"' },
  { table: '"TeacherShift"', column: '"classId"' },
  { table: '"Homework"', column: '"classId"' },
  { table: '"FeeStructure"', column: '"classId"' },
  { table: '"AttendanceDelegation"', column: '"classId"' },
  { table: '"BulkAttendance"', column: '"classId"' },
  { table: '"GlobalFeeStructure"', column: '"classId"' },
  { table: '"CalendarEventTarget"', column: '"classId"' },
  { table: '"ExamEvaluator"', column: '"classId"' },
  { table: '"MarksSubmission"', column: '"classId"' },
  { table: '"Conversation"', column: '"classId"' },
  { table: '"Alumni"', column: '"lastClassId"' },
  { table: '"PromotionHistory"', column: '"fromClassId"' },
  { table: '"PromotionHistory"', column: '"toClassId"' },
];

const SECTION_TABLES = [
  { table: '"Student"', column: '"sectionId"' },
  { table: '"StudentSession"', column: '"sectionId"' },
  { table: '"NoticeTarget"', column: '"sectionId"' },
  { table: '"SectionSubjectTeacher"', column: '"sectionId"' },
  { table: '"TimetableEntry"', column: '"sectionId"' },
  { table: '"TeacherShift"', column: '"sectionId"' },
  { table: '"Timetable"', column: '"sectionId"' },
  { table: '"Homework"', column: '"sectionId"' },
  { table: '"AttendanceDelegation"', column: '"sectionId"' },
  { table: '"BulkAttendance"', column: '"sectionId"' },
  { table: '"CalendarEventTarget"', column: '"sectionId"' },
  { table: '"Conversation"', column: '"sectionId"' },
  { table: '"Alumni"', column: '"lastSectionId"' },
  { table: '"PromotionHistory"', column: '"fromSectionId"' },
  { table: '"PromotionHistory"', column: '"toSectionId"' },
];

function normalizeName(value) {
  return (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

async function updateForeignKey(tx, table, column, fromId, toId) {
  return tx.$executeRawUnsafe(
    `UPDATE ${table} SET ${column} = $1 WHERE ${column} = $2`,
    toId,
    fromId
  );
}

async function updateSectionForeignKey(tx, table, column, fromId, toId) {
  return tx.$executeRawUnsafe(
    `UPDATE ${table} SET ${column} = $1 WHERE ${column} = $2`,
    toId,
    fromId
  );
}

async function dedupeSectionScopedTables(tx, primarySectionId, staleSectionId) {
  // These tables have uniqueness constraints that can collide when the stale
  // section is merged into the primary section. Prefer keeping the canonical row.
  await tx.$executeRawUnsafe(
    `DELETE FROM "SectionSubjectTeacher" sst
     USING "SectionSubjectTeacher" keep
     WHERE sst."sectionId" = $1
       AND keep."sectionId" = $2
       AND keep."subjectId" = sst."subjectId"`,
    staleSectionId,
    primarySectionId
  );

  await tx.$executeRawUnsafe(
    `DELETE FROM "TimetableEntry" te
     USING "TimetableEntry" keep
     WHERE te."sectionId" = $1
       AND keep."sectionId" = $2
       AND keep."classId" = te."classId"
       AND keep."timeSlotId" = te."timeSlotId"
       AND keep."dayOfWeek" = te."dayOfWeek"`,
    staleSectionId,
    primarySectionId
  );

  await tx.$executeRawUnsafe(
    `DELETE FROM "AttendanceDelegation" ad
     USING "AttendanceDelegation" keep
     WHERE ad."sectionId" = $1
       AND keep."sectionId" = $2
       AND keep."schoolId" = ad."schoolId"
       AND keep."classId" = ad."classId"
       AND keep."startDate" = ad."startDate"
       AND keep."endDate" = ad."endDate"`,
    staleSectionId,
    primarySectionId
  );

  await tx.$executeRawUnsafe(
    `DELETE FROM "Conversation" c
     USING "Conversation" keep
     WHERE c."sectionId" = $1
       AND keep."sectionId" = $2
       AND keep."schoolId" = c."schoolId"
       AND keep."type" = c."type"
       AND keep."title" IS NOT DISTINCT FROM c."title"
       AND keep."createdById" = c."createdById"`,
    staleSectionId,
    primarySectionId
  );
}

async function dedupeClassScopedTables(tx, primaryClassId, staleClassId, schoolId) {
  await tx.$executeRawUnsafe(
    `DELETE FROM "GlobalFeeStructure" gfs
     USING "GlobalFeeStructure" keep
     WHERE gfs."classId" = $1
       AND keep."classId" = $2
       AND keep."schoolId" = gfs."schoolId"
       AND keep."academicYearId" = gfs."academicYearId"`,
    staleClassId,
    primaryClassId
  );

  await tx.$executeRawUnsafe(
    `DELETE FROM "MarksSubmission" ms
     USING "MarksSubmission" keep
     WHERE ms."classId" = $1
       AND keep."classId" = $2
       AND keep."examId" = ms."examId"
       AND keep."subjectId" = ms."subjectId"`,
    staleClassId,
    primaryClassId
  );

  await tx.$executeRawUnsafe(
    `DELETE FROM "ExamEvaluator" ee
     USING "ExamEvaluator" keep
     WHERE ee."classId" = $1
       AND keep."classId" = $2
       AND keep."examId" = ee."examId"
       AND keep."teacherId" = ee."teacherId"
       AND keep."subjectId" = ee."subjectId"`,
    staleClassId,
    primaryClassId
  );

  await tx.$executeRawUnsafe(
    `DELETE FROM "AttendanceDelegation" ad
     USING "AttendanceDelegation" keep
     WHERE ad."classId" = $1
       AND keep."classId" = $2
       AND keep."schoolId" = ad."schoolId"
       AND keep."sectionId" IS NOT DISTINCT FROM ad."sectionId"
       AND keep."startDate" = ad."startDate"
       AND keep."endDate" = ad."endDate"`,
    staleClassId,
    primaryClassId
  );

  await tx.$executeRawUnsafe(
    `DELETE FROM "Conversation" c
     USING "Conversation" keep
     WHERE c."classId" = $1
       AND keep."classId" = $2
       AND keep."schoolId" = c."schoolId"
       AND keep."sectionId" IS NOT DISTINCT FROM c."sectionId"
       AND keep."type" = c."type"
       AND keep."title" IS NOT DISTINCT FROM c."title"
       AND keep."createdById" = c."createdById"`,
    staleClassId,
    primaryClassId
  );

  await tx.$executeRawUnsafe(
    `DELETE FROM "BulkAttendance" ba
     USING "BulkAttendance" keep
     WHERE ba."classId" = $1
       AND keep."classId" = $2
       AND keep."schoolId" = ba."schoolId"
       AND keep."date" = ba."date"
       AND keep."sectionId" IS NOT DISTINCT FROM ba."sectionId"`,
    staleClassId,
    primaryClassId
  );
}

async function run() {
  const schoolId = 'daa851f1-88bd-4220-9f7b-7744c4a37d4d';

  // 1. Get all classes for the school
  const allClasses = await prisma.class.findMany({
    where: { schoolId },
    include: { sections: true }
  });

  // Group by normalized class name + academic year to avoid merging legitimate
  // classes from different sessions.
  const classByName = {};
  allClasses.forEach(c => {
    const key = `${normalizeName(c.className)}::${c.academicYearId || 'none'}`;
    if (!classByName[key]) classByName[key] = [];
    classByName[key].push(c);
  });

  console.log(`Found ${Object.keys(classByName).length} unique class names.`);

  for (const [groupKey, classes] of Object.entries(classByName)) {
    if (classes.length > 1) {
      const name = classes[0]?.className || groupKey;
      console.log(`\nDuplicate found for class [${name}]. You have ${classes.length} versions.`);
      
      // Let's identify the "active" one (has students) and the "stale" ones
      const classesWithStudents = await Promise.all(classes.map(async (c) => {
        const studentCount = await prisma.student.count({ where: { classId: c.id } });
        const sessionCount = await prisma.studentSession.count({ where: { classId: c.id } });
        const attendanceCount = await prisma.bulkAttendance.count({ where: { classId: c.id } });
        return { ...c, studentCount, sessionCount, attendanceCount };
      }));

      // Sort by live usage first, then prefer the older id as the canonical row.
      classesWithStudents.sort((a, b) =>
        (b.studentCount - a.studentCount) ||
        (b.sessionCount - a.sessionCount) ||
        (b.attendanceCount - a.attendanceCount) ||
        (a.id - b.id)
      );
      
      const primaryClass = classesWithStudents[0];
      const staleClasses = classesWithStudents.slice(1);

      console.log(`  Keeping class ID ${primaryClass.id} (${primaryClass.studentCount} students, ${primaryClass.sessionCount} sessions, ${primaryClass.attendanceCount} bulk attendance rows)`);

      for (const stale of staleClasses) {
        console.log(`  Migrating stale class ID ${stale.id} (${stale.studentCount} students, ${stale.sessionCount} sessions, ${stale.attendanceCount} bulk attendance rows)`);

        await prisma.$transaction(async (tx) => {
          const freshPrimary = await tx.class.findUnique({
            where: { id: primaryClass.id },
            include: { sections: true },
          });

          const sectionIdMap = new Map();

          for (const staleSec of stale.sections) {
            const normalizedSectionName = normalizeName(staleSec.name);
            let primarySec = freshPrimary.sections.find(s => normalizeName(s.name) === normalizedSectionName);

            if (!primarySec) {
              primarySec = await tx.section.create({
                data: {
                  classId: freshPrimary.id,
                  schoolId,
                  name: staleSec.name,
                  teachingStaffUserId: staleSec.teachingStaffUserId || null,
                  capacity: staleSec.capacity ?? null,
                },
              });
              freshPrimary.sections.push(primarySec);
              console.log(`    Created missing section ${primarySec.name} on class ${freshPrimary.id}`);
            } else if (!primarySec.teachingStaffUserId && staleSec.teachingStaffUserId) {
              await tx.section.update({
                where: { id: primarySec.id },
                data: { teachingStaffUserId: staleSec.teachingStaffUserId },
              });
              primarySec.teachingStaffUserId = staleSec.teachingStaffUserId;
              console.log(`    Migrated teacher ${staleSec.teachingStaffUserId} to section ${primarySec.name}`);
            }

            sectionIdMap.set(staleSec.id, primarySec.id);
          }

          await dedupeClassScopedTables(tx, freshPrimary.id, stale.id, schoolId);

          for (const { table, column } of CLASS_TABLES) {
            await updateForeignKey(tx, table, column, stale.id, freshPrimary.id);
          }

          for (const staleSec of stale.sections) {
            const primarySectionId = sectionIdMap.get(staleSec.id);
            if (!primarySectionId) continue;

            await dedupeSectionScopedTables(tx, primarySectionId, staleSec.id);

            for (const { table, column } of SECTION_TABLES) {
              await updateSectionForeignKey(tx, table, column, staleSec.id, primarySectionId);
            }
          }

          await tx.section.deleteMany({
            where: { classId: stale.id }
          });

          await tx.class.delete({
            where: { id: stale.id }
          });
        });
      }
    }
  }

  console.log('Cleanup completed successfully.');
}

run().catch(console.error).finally(() => prisma.$disconnect());
