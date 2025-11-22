const { default: prisma } = require("@/lib/prisma");


async function main() {
    try {
        console.log('Checking roles...');
        const roles = await prisma.role.findMany();
        console.log('Existing roles:', roles);
        const partnerRole = roles.find(r => r.name === 'PARTNER');
        if (!partnerRole) {
            console.log('PARTNER role not found. Creating it...');
            const newRole = await prisma.role.create({
                data: {
                    name: 'PARTNER'
                }
            });
            console.log('Created PARTNER role:', newRole);
        } else {
            console.log('PARTNER role already exists.');
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}
main();