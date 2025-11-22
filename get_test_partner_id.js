const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getPartnerId() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'link_fix_test@example.com' },
            include: { partner: true }
        });

        if (user && user.partner) {
            console.log(`Partner ID: ${user.partner.id}`);
        } else {
            console.log('Partner not found for this user.');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

getPartnerId();
