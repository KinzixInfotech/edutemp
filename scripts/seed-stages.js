const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_STAGES = [
    { name: 'Review', order: 1, type: 'SYSTEM' },
    { name: 'Test/Interview', order: 2, type: 'SYSTEM', requiresTest: true, requiresInterview: true },
    { name: 'Offer', order: 3, type: 'SYSTEM' },
    { name: 'Enrolled', order: 4, type: 'SYSTEM', feeRequired: true },
    { name: 'Rejected', order: 5, type: 'SYSTEM' },
];

async function main() {
    console.log('Seeding default admission stages...');

    const schools = await prisma.school.findMany();
    console.log(`Found ${schools.length} schools.`);

    for (const school of schools) {
        console.log(`Processing school: ${school.name} (${school.id})`);

        for (const stageTemplate of DEFAULT_STAGES) {
            try {
                const existingStage = await prisma.stage.findFirst({
                    where: {
                        schoolId: school.id,
                        name: stageTemplate.name,
                    },
                });

                if (!existingStage) {
                    await prisma.stage.create({
                        data: {
                            schoolId: school.id,
                            ...stageTemplate,
                        },
                    });
                    console.log(`  Created stage: ${stageTemplate.name}`);
                } else {
                    // Update existing stage to match template if needed, or just skip
                    // For now, let's ensure type is SYSTEM if it matches name
                    if (existingStage.type !== 'SYSTEM') {
                        await prisma.stage.update({
                            where: { id: existingStage.id },
                            data: { type: 'SYSTEM' }
                        });
                        console.log(`  Updated stage type: ${stageTemplate.name}`);
                    }
                    console.log(`  Stage already exists: ${stageTemplate.name}`);
                }
            } catch (error) {
                console.error(`  Error processing stage ${stageTemplate.name}:`, error.message);
            }
        }
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
