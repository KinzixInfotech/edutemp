/**
 * Backfill script: Populate StudentSession from existing Student data
 * 
 * For each Student with academicYearId:
 * 1. Create StudentSession record
 * 2. Set Student.currentSessionId to the new session
 * 
 * Safe to run multiple times (duplicate protection via upsert)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
    console.log('Starting StudentSession backfill...');

    // Get all students with academicYearId
    const students = await prisma.student.findMany({
        where: {
            academicYearId: { not: null },
        },
        select: {
            userId: true,
            classId: true,
            sectionId: true,
            rollNumber: true,
            academicYearId: true,
            isAlumni: true,
        },
    });

    console.log(`Found ${students.length} students to backfill`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const student of students) {
        try {
            // Upsert = create if not exists, skip if exists (duplicate protection)
            const session = await prisma.studentSession.upsert({
                where: {
                    studentId_academicYearId: {
                        studentId: student.userId,
                        academicYearId: student.academicYearId,
                    },
                },
                create: {
                    studentId: student.userId,
                    academicYearId: student.academicYearId,
                    classId: student.classId,
                    sectionId: student.sectionId,
                    rollNumber: student.rollNumber,
                    status: student.isAlumni ? 'ALUMNI' : 'ACTIVE',
                },
                update: {}, // No-op if exists
            });

            // Update currentSessionId pointer
            await prisma.student.update({
                where: { userId: student.userId },
                data: { currentSessionId: session.id },
            });

            created++;
        } catch (err) {
            console.error(`Error for student ${student.userId}: ${err.message}`);
            errors++;
        }
    }

    console.log(`\nBackfill complete:`);
    console.log(`  Created: ${created}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);

    // Verify
    const sessionCount = await prisma.studentSession.count();
    const studentCount = await prisma.student.count({ where: { academicYearId: { not: null } } });
    const linkedCount = await prisma.student.count({ where: { currentSessionId: { not: null } } });

    console.log(`\nVerification:`);
    console.log(`  StudentSession rows: ${sessionCount}`);
    console.log(`  Students with academicYearId: ${studentCount}`);
    console.log(`  Students with currentSessionId: ${linkedCount}`);
    console.log(`  Match: ${sessionCount === studentCount ? '✅ YES' : '❌ NO — investigate!'}`);
}

backfill()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
