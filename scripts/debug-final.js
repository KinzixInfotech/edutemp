
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DEBUG: Schools & Users ---');

    const targetSchoolId = '4048cc40-d2d8-4e75-8419-41ff2283daf7';
    const targetUserId = 'a98391d7-a86f-4ebf-8017-55d7786ef014';

    // 1. List All Schools
    const schools = await prisma.school.findMany();
    console.log(`\n🏫 Schools Found: ${schools.length}`);
    schools.forEach(s => console.log(`   - [${s.id}] ${s.name} (${s.schoolCode})`));

    const targetSchool = schools.find(s => s.id === targetSchoolId);
    if (targetSchool) console.log(`   ✅ Target School FOUND.`);
    else console.log(`   ❌ Target School ${targetSchoolId} NOT FOUND.`);

    // 2. List All Users
    const users = await prisma.user.findMany();
    console.log(`\n👤 Users Found: ${users.length}`);
    users.forEach(u => console.log(`   - [${u.id}] ${u.email} (School: ${u.schoolId})`));

    const targetUser = users.find(u => u.id === targetUserId);
    if (targetUser) console.log(`   ✅ Target User FOUND.`);
    else console.log(`   ❌ Target User ${targetUserId} NOT FOUND.`);

    console.log('\n--- End Debug ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
