const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const schoolId = 'daa851f1-88bd-4220-9f7b-7744c4a37d4d';
    const term = 1;

    console.log("Fetching teachers...");
    try {
        const teachers = await prisma.teachingStaff.findMany({
            where: { schoolId },
            select: {
                user: { select: { profilePicture: true } },
                userId: true, name: true, email: true
            },
            orderBy: { name: 'asc' }
        });
        console.log(`Found ${teachers.length} teachers.`);

        if (teachers.length > 0) {
            const userId = teachers[0].userId;
            console.log(`Testing counts for teacher ${userId}...`);
            
            try {
                const count1 = await prisma.competencyAssessment.count({
                    where: { assessedById: userId, termNumber: term }
                });
                console.log("competencyAssessment OK", count1);
            } catch (e) { console.error("competencyAssessment Failed:", e.message); }

            try {
                const count2 = await prisma.studentActivityRecord.count({
                    where: { recordedById: userId, termNumber: term }
                });
                console.log("studentActivityRecord OK", count2);
            } catch (e) { console.error("studentActivityRecord Failed:", e.message); }

            try {
                const count3 = await prisma.sELAssessment.count({
                    where: { assessedById: userId, termNumber: term }
                });
                console.log("sELAssessment OK", count3);
            } catch (e) { console.error("sELAssessment Failed:", e.message); }
        }
    } catch (e) {
        console.error("TeachingStaff Failed:", e.message);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
