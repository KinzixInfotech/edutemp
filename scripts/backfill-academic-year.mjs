/**
 * Data Backfill Script: Bind existing session-bound data to the active academic year
 * 
 * This script sets `academicYearId` on all existing rows in:
 *   - TimetableEntry
 *   - Homework
 *   - StudentRouteAssignment
 *   - LibraryTransaction
 * 
 * Strategy: For each school, find the active academic year and bind all
 * NULL-academicYearId rows to it.
 * 
 * Usage: node scripts/backfill-academic-year.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting academic year backfill...\n');

    // 1. Get all schools with their active academic year
    const schools = await prisma.school.findMany({
        select: {
            id: true,
            name: true,
            academicYears: {
                where: { isActive: true },
                select: { id: true, name: true },
                take: 1,
            },
        },
    });

    console.log(`Found ${schools.length} school(s)\n`);

    let totalUpdated = {
        timetableEntries: 0,
        homework: 0,
        studentRouteAssignments: 0,
        libraryTransactions: 0,
    };

    for (const school of schools) {
        const activeYear = school.academicYears[0];
        if (!activeYear) {
            console.log(`⚠️  ${school.name} — No active academic year found, skipping`);
            continue;
        }

        console.log(`📌 ${school.name} → ${activeYear.name} (${activeYear.id})`);

        // --- TimetableEntry ---
        const ttResult = await prisma.timetableEntry.updateMany({
            where: {
                schoolId: school.id,
                academicYearId: null,
            },
            data: {
                academicYearId: activeYear.id,
            },
        });
        totalUpdated.timetableEntries += ttResult.count;
        if (ttResult.count > 0) console.log(`   ✅ TimetableEntry: ${ttResult.count} rows updated`);

        // --- Homework ---
        const hwResult = await prisma.homework.updateMany({
            where: {
                schoolId: school.id,
                academicYearId: null,
            },
            data: {
                academicYearId: activeYear.id,
            },
        });
        totalUpdated.homework += hwResult.count;
        if (hwResult.count > 0) console.log(`   ✅ Homework: ${hwResult.count} rows updated`);

        // --- StudentRouteAssignment ---
        const sraResult = await prisma.studentRouteAssignment.updateMany({
            where: {
                schoolId: school.id,
                academicYearId: null,
            },
            data: {
                academicYearId: activeYear.id,
            },
        });
        totalUpdated.studentRouteAssignments += sraResult.count;
        if (sraResult.count > 0) console.log(`   ✅ StudentRouteAssignment: ${sraResult.count} rows updated`);

        // --- LibraryTransaction ---
        const ltResult = await prisma.libraryTransaction.updateMany({
            where: {
                schoolId: school.id,
                academicYearId: null,
            },
            data: {
                academicYearId: activeYear.id,
            },
        });
        totalUpdated.libraryTransactions += ltResult.count;
        if (ltResult.count > 0) console.log(`   ✅ LibraryTransaction: ${ltResult.count} rows updated`);

        console.log('');
    }

    // --- Summary ---
    console.log('═══════════════════════════════════════');
    console.log('📊 BACKFILL SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`   TimetableEntry:          ${totalUpdated.timetableEntries} rows`);
    console.log(`   Homework:                ${totalUpdated.homework} rows`);
    console.log(`   StudentRouteAssignment:  ${totalUpdated.studentRouteAssignments} rows`);
    console.log(`   LibraryTransaction:      ${totalUpdated.libraryTransactions} rows`);
    console.log(`   ─────────────────────────────────`);
    const grandTotal = Object.values(totalUpdated).reduce((a, b) => a + b, 0);
    console.log(`   TOTAL:                   ${grandTotal} rows`);
    console.log('═══════════════════════════════════════');

    // Verify: check for any remaining NULL rows
    const remaining = {
        tt: await prisma.timetableEntry.count({ where: { academicYearId: null } }),
        hw: await prisma.homework.count({ where: { academicYearId: null } }),
        sra: await prisma.studentRouteAssignment.count({ where: { academicYearId: null } }),
        lt: await prisma.libraryTransaction.count({ where: { academicYearId: null } }),
    };

    const totalRemaining = Object.values(remaining).reduce((a, b) => a + b, 0);
    if (totalRemaining === 0) {
        console.log('\n✅ All rows successfully bound to an academic year!');
    } else {
        console.log(`\n⚠️  ${totalRemaining} rows still have NULL academicYearId:`);
        if (remaining.tt) console.log(`   - TimetableEntry: ${remaining.tt}`);
        if (remaining.hw) console.log(`   - Homework: ${remaining.hw}`);
        if (remaining.sra) console.log(`   - StudentRouteAssignment: ${remaining.sra}`);
        if (remaining.lt) console.log(`   - LibraryTransaction: ${remaining.lt}`);
        console.log('   (These may belong to schools without an active academic year)');
    }
}

main()
    .catch((e) => {
        console.error('❌ Backfill failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
