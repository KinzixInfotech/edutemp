const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const updated = await prisma.exam.update({
            where: { id: 7 },
            data: {
                startDate: null,
                endDate: null
            }
        });

        console.log("✓ Exam dates cleared successfully!");
        console.log(`Exam "${updated.title}" can now be taken at any time.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
