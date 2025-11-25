const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const exam = await prisma.exam.findUnique({
            where: { id: 7 },
            select: {
                id: true,
                title: true,
                type: true,
                status: true,
                startDate: true,
                endDate: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!exam) {
            console.log("Exam ID 7 not found");
            return;
        }

        console.log("Exam Details:");
        console.log("=============");
        console.log(`ID: ${exam.id}`);
        console.log(`Title: ${exam.title}`);
        console.log(`Type: ${exam.type}`);
        console.log(`Status: ${exam.status}`);
        console.log(`Start Date: ${exam.startDate}`);
        console.log(`End Date: ${exam.endDate}`);
        console.log(`Created: ${exam.createdAt}`);
        console.log(`Updated: ${exam.updatedAt}`);
        console.log("\nCurrent Time:", new Date());

        if (exam.endDate) {
            const now = new Date();
            if (now > exam.endDate) {
                console.log("\n⚠️  ISSUE: Current time is AFTER the exam end date");
                console.log(`Exam ended ${Math.round((now - exam.endDate) / 1000 / 60)} minutes ago`);
            } else {
                console.log("\n✓ Current time is BEFORE the exam end date");
            }
        } else {
            console.log("\n✓ No end date set - exam can be taken anytime");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
