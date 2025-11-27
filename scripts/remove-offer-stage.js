const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeOfferStage() {
    try {
        console.log("Starting removal of 'Offer' stage...");

        // Find all stages named "OFFER" (case-insensitive)
        const offerStages = await prisma.stage.findMany({
            where: {
                name: {
                    equals: 'OFFER',
                    mode: 'insensitive',
                },
            },
        });

        console.log(`Found ${offerStages.length} 'Offer' stages.`);

        for (const stage of offerStages) {
            console.log(`Processing stage: ${stage.name} (${stage.id})`);

            // 1. Handle applications currently in this stage
            // Move them to a safe stage (e.g., "REVIEW" or "SHORTLISTED") or just warn
            // For now, let's just log them. If we delete the stage, we might violate foreign keys if not careful.
            // But usually, we should move them first.

            const appsInStage = await prisma.application.findMany({
                where: { currentStageId: stage.id }
            });

            if (appsInStage.length > 0) {
                console.warn(`WARNING: ${appsInStage.length} applications are currently in this stage. They will be orphaned or deleted if we proceed without moving them.`);
                // Ideally, move them to the previous stage or a default stage.
                // Let's try to find a "REVIEW" stage for the same school.
                const reviewStage = await prisma.stage.findFirst({
                    where: { schoolId: stage.schoolId, name: { equals: 'REVIEW', mode: 'insensitive' } }
                });

                if (reviewStage) {
                    console.log(`Moving applications to 'REVIEW' stage (${reviewStage.id})...`);
                    await prisma.application.updateMany({
                        where: { currentStageId: stage.id },
                        data: { currentStageId: reviewStage.id }
                    });
                } else {
                    console.error("Could not find a fallback stage. Skipping deletion for this school to prevent data loss.");
                    continue;
                }
            }

            // 2. Delete Stage History referencing this stage
            await prisma.stageHistory.deleteMany({
                where: { stageId: stage.id }
            });

            // 3. Delete the stage itself
            await prisma.stage.delete({
                where: { id: stage.id }
            });

            console.log(`Deleted stage: ${stage.name}`);
        }

        console.log("Finished removal of 'Offer' stages.");

    } catch (error) {
        console.error("Error removing 'Offer' stage:", error);
    } finally {
        await prisma.$disconnect();
    }
}

removeOfferStage();
