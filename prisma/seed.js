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
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
