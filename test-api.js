import { PrismaClient } from './src/app/generated/prisma/index.js';

const prisma = new PrismaClient();

async function run() {
    const profile = await prisma.schoolPublicProfile.findFirst({
        where: { slug: 'flora-school-of-excellence-opposite-silwar-pahar-near-meru-hazaribagh-jharkhand' },
        include: {
            school: {
                select: {
                    name: true,
                    location: true,
                    profilePicture: true,
                    contactNumber: true,
                    atlas_classFrom: true,
                    atlas_classTo: true,
                    classes: {
                        select: { className: true },
                        orderBy: { className: 'asc' },
                    },
                }
            }
        }
    });

    console.log("Raw Profile School is null?", profile.school === null);

    const schoolObject = profile.school || {
            name: profile.independentName || 'Unnamed School',
            location: profile.independentLocation || '',
            profilePicture: profile.independentLogo || profile.logoImage || '',
            contactNumber: profile.independentPhone || profile.publicPhone || '',
            atlas_classFrom: profile.independentClassFrom || null,
            atlas_classTo: profile.independentClassTo || null,
            classes: [],
    };
    
    console.log("Normalized School Object atlas_classFrom:", schoolObject.atlas_classFrom, "atlas_classTo:", schoolObject.atlas_classTo);
}

run().catch(console.error).finally(() => prisma.$disconnect());
