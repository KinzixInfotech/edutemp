const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugUser() {
    const userId = '8ce04d07-54bf-4f11-a250-9d6cf3a99f08';
    console.log(`Fetching user ${userId}...`);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            role: true,
            school: true,
            Admin: true,
        }
    });

    if (!user) {
        console.log('User not found!');
    } else {
        console.log('User Details:');
        console.log(`ID: ${user.id}`);
        console.log(`Name: ${user.name}`);
        console.log(`Email: ${user.email}`);
        console.log(`Status: ${user.status}`);
        console.log(`SchoolId: ${user.schoolId}`);
        console.log(`Role: ${user.role ? user.role.name : 'None'}`);
        console.log(`Admin Profile: ${user.Admin ? 'Exists' : 'None'}`);
        console.log(`DeletedAt: ${user.deletedAt}`);
    }
}

debugUser()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
