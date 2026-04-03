const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '').replace(/-+$/, '');
}

function generateSchoolSlug(name, location) {
    if (!name) return '';
    const namePart = slugify(name);
    const locationPart = location ? slugify(location) : '';
    if (locationPart && !namePart.includes(locationPart)) {
        return `${namePart}-${locationPart}`;
    }
    return namePart;
}

function generateUniqueSlug(baseSlug, existingSlugs = []) {
    if (!existingSlugs.includes(baseSlug)) return baseSlug;
    let counter = 2;
    let uniqueSlug = `${baseSlug}-${counter}`;
    while (existingSlugs.includes(uniqueSlug)) {
        counter++;
        uniqueSlug = `${baseSlug}-${counter}`;
    }
    return uniqueSlug;
}

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
