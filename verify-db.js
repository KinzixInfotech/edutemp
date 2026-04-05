import prisma from './src/lib/prisma.js';

async function verify() {
    const totalSchools = await prisma.school.count({
        where: { SubscriptionType: 'ATLAS_ONLY' }
    });
    
    const totalProfiles = await prisma.schoolPublicProfile.count({});
    
    const progress = await prisma.importProgress.findMany({});
    
    console.log(`\n================ VERIFICATION ================`);
    console.log(`Schools ingested: ${totalSchools}`);
    console.log(`Public Profiles: ${totalProfiles}`);
    console.table(progress);
    console.log(`=============================================\n`);
    
    process.exit(0);
}
verify();
