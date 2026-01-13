const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Define all system roles (just names, no description since Role model doesn't have it)
const SYSTEM_ROLES = [
    'SUPER_ADMIN',
    'DIRECTOR',
    'PRINCIPAL',
    'ADMIN',
    'TEACHING_STAFF',
    'NON_TEACHING_STAFF',
    'STUDENT',
    'PARENT',
    'ACCOUNTANT',
    'LIBRARIAN',
    'DRIVER',
    'CONDUCTOR',
];

// Default admission stages with fixed names that match the view page switch cases
// Only 4 stages: Review → Test → Enrolled (+ Rejected)
const DEFAULT_ADMISSION_STAGES = [
    { name: 'REVIEW', order: 1, type: 'SYSTEM' },
    { name: 'TEST_INTERVIEW', order: 2, type: 'SYSTEM', requiresTest: true, requiresInterview: true },
    { name: 'ENROLLED', order: 3, type: 'SYSTEM' },
    { name: 'REJECTED', order: 4, type: 'SYSTEM' },
];

// Helper function to seed stages for a school
async function seedStagesForSchool(schoolId) {
    console.log(`  📋 Seeding stages for school: ${schoolId}`);

    for (const stage of DEFAULT_ADMISSION_STAGES) {
        try {
            await prisma.stage.upsert({
                where: {
                    schoolId_name: { schoolId, name: stage.name }
                },
                update: {
                    order: stage.order,
                    type: stage.type,
                    requiresTest: stage.requiresTest || false,
                    requiresInterview: stage.requiresInterview || false,
                    feeRequired: stage.feeRequired || false,
                },
                create: {
                    schoolId,
                    name: stage.name,
                    order: stage.order,
                    type: stage.type,
                    requiresTest: stage.requiresTest || false,
                    requiresInterview: stage.requiresInterview || false,
                    feeRequired: stage.feeRequired || false,
                },
            });
            console.log(`    ✓ Stage: ${stage.name}`);
        } catch (error) {
            // If unique constraint fails on order, try with different order
            if (error.code === 'P2002' && error.meta?.target?.includes('order')) {
                console.log(`    ⚠ Stage ${stage.name} order conflict, skipping...`);
            } else {
                throw error;
            }
        }
    }
}

async function main() {
    console.log('🌱 Seeding roles...');

    for (const roleName of SYSTEM_ROLES) {
        const result = await prisma.role.upsert({
            where: { name: roleName },
            update: {},
            create: { name: roleName },
        });
        console.log(`  ✓ Role: ${result.name}`);
    }

    console.log(`\n✅ Seeded ${SYSTEM_ROLES.length} roles successfully!`);

    // Seed stages for all existing schools
    console.log('\n🌱 Seeding admission stages for existing schools...');
    const schools = await prisma.school.findMany({ select: { id: true, name: true } });

    if (schools.length === 0) {
        console.log('  ℹ No schools found. Stages will be created when schools are added.');
    } else {
        for (const school of schools) {
            console.log(`\n  📚 School: ${school.name}`);
            await seedStagesForSchool(school.id);
        }
        console.log(`\n✅ Seeded stages for ${schools.length} school(s)!`);
    }
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
