/**
 * Backfill Script: Bind all Bright Future School students to the active academic year
 * 
 * Usage: node scripts/backfill-students-bright-school.cjs
 */

const { PrismaClient } = require('../src/app/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
    require('dotenv').config();
}

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🔄 Starting student backfill for Bright Future School...\n');

    // Find Bright Future School
    const school = await prisma.school.findFirst({
        where: { name: { contains: 'Bright Future', mode: 'insensitive' } },
        select: { id: true, name: true },
    });

    if (!school) {
        console.log('❌ Bright Future School not found');
        return;
    }
    console.log(`📌 Found: ${school.name} (${school.id})`);

    // Find active academic year
    const activeYear = await prisma.academicYear.findFirst({
        where: { schoolId: school.id, isActive: true },
        select: { id: true, name: true },
    });

    if (!activeYear) {
        console.log('❌ No active academic year found');
        return;
    }
    console.log(`📅 Active Year: ${activeYear.name} (${activeYear.id})\n`);

    // Count students with NULL academicYearId
    const nullCount = await prisma.student.count({
        where: {
            schoolId: school.id,
            academicYearId: null,
        },
    });

    // Count students already bound
    const boundCount = await prisma.student.count({
        where: {
            schoolId: school.id,
            academicYearId: { not: null },
        },
    });

    console.log(`📊 Before backfill:`);
    console.log(`   Already bound:   ${boundCount}`);
    console.log(`   NULL (unbound):  ${nullCount}\n`);

    if (nullCount === 0) {
        console.log('✅ All students are already bound to an academic year!');
        return;
    }

    // Bind all unbound students to the active academic year
    const result = await prisma.student.updateMany({
        where: {
            schoolId: school.id,
            academicYearId: null,
        },
        data: {
            academicYearId: activeYear.id,
        },
    });

    console.log(`✅ Updated ${result.count} students → bound to ${activeYear.name}`);

    // Verify
    const remainingNull = await prisma.student.count({
        where: {
            schoolId: school.id,
            academicYearId: null,
        },
    });

    const totalBound = await prisma.student.count({
        where: {
            schoolId: school.id,
            academicYearId: { not: null },
        },
    });

    console.log(`\n📊 After backfill:`);
    console.log(`   Bound:     ${totalBound}`);
    console.log(`   Remaining: ${remainingNull}`);

    if (remainingNull === 0) {
        console.log('\n✅ All Bright Future School students are now session-bound!');
    }
}

main()
    .catch((e) => {
        console.error('❌ Backfill failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
