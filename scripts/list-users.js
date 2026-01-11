
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Listing All Users in public.User Table ---');

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: {
                    select: { name: true }
                }
            }
        });

        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- [${u.id}] ${u.email} (${u.name}) - Role: ${u.role?.name}`);
        });

        const targetId = 'a98391d7-a86f-4ebf-8017-55d7786ef014';
        const targetUser = users.find(u => u.id === targetId);

        if (targetUser) {
            console.log(`\n✅ Target user ${targetId} FOUND!`);
        } else {
            console.log(`\n❌ Target user ${targetId} NOT found in this list.`);
        }

    } catch (e) {
        console.log('❌ Error querying User table:', e.message);
    }

    console.log('--- End Listing ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
