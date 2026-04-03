import { PrismaClient } from '@prisma/client';
import { generateSchoolSlug, generateUniqueSlug } from './src/lib/slug-generator.js';

const prisma = new PrismaClient();

async function main() {    
    const profiles = await prisma.schoolPublicProfile.findMany({        
        where: { slug: null },        
        include: { school: true }    
    });    
    console.log(`Found ${profiles.length} profiles without slugs.`);    
    let count = 0;    
    
    for (const profile of profiles) {        
        if (!profile.school) continue;        
        const baseSlug = generateSchoolSlug(profile.school.name, profile.school.location);        
        if (!baseSlug) continue;        
        const existingSlugs = await prisma.schoolPublicProfile.findMany({            
            where: { slug: { startsWith: baseSlug } },            
            select: { slug: true }        
        }).then(res => res.map(r => r.slug));        
        const finalSlug = generateUniqueSlug(baseSlug, existingSlugs);        
        await prisma.schoolPublicProfile.update({            
            where: { id: profile.id },            
            data: { slug: finalSlug }        
        });        
        console.log(`Backfilled: ${finalSlug}`);        
        count++;    
    }    
    console.log(`Successfully backfilled ${count} slugs.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
