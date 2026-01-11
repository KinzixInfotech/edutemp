
require('dotenv').config(); // Load environment variables!
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('--- CORRECTED DEBUG: Checking Database Content ---');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Loaded (starts with ' + process.env.DATABASE_URL.substring(0, 10) + '...)' : '❌ NOT LOADED');

    const targetUserId = 'a98391d7-a86f-4ebf-8017-55d7786ef014';

    try {
        // 1. Count Users
        const userCount = await prisma.user.count();
        console.log(`\n📊 Total Users in DB: ${userCount}`);

        if (userCount > 0) {
            const firstUser = await prisma.user.findFirst();
            console.log(`   Sample User: ${firstUser.email} (ID: ${firstUser.id})`);
        }

        // 2. Check Specific User
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId }
        });

        if (targetUser) {
            console.log(`\n✅ Target User ${targetUserId} FOUND!`);
            console.log(`   Email: ${targetUser.email}`);
            console.log(`   Role ID: ${targetUser.roleId}`);
        } else {
            console.log(`\n❌ Target User ${targetUserId} NOT FOUND in this database.`);
        }

    } catch (e) {
        console.error('❌ Database connection error:', e.message);
    } finally {
        await prisma.$disconnect();
    }

    console.log('--- End Debug ---');
}

main();
