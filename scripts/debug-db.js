
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Database ---');

    const userId = 'a98391d7-a86f-4ebf-8017-55d7786ef014';

    // 1. Check User
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (user) {
            console.log(`✅ User found: ${user.email} (${user.id})`);
            console.log(`   FCM Token: ${user.fcmToken || 'None'}`);
        } else {
            console.log(`❌ User NOT found: ${userId}`);
        }
    } catch (e) {
        console.log('❌ Error querying User:', e.message);
    }

    // 2. Check LibraryBookRequest Schema
    try {
        const count = await prisma.libraryBookRequest.count();
        console.log(`✅ LibraryBookRequest table exists. Count: ${count}`);
    } catch (e) {
        console.log('❌ Error querying LibraryBookRequest:', e.message);
    }

    console.log('--- End Debug ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
