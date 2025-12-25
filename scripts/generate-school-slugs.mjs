/**
 * Scalable script to generate slugs for existing schools
 * Handles large databases with batching and progress tracking
 * 
 * Run with: node scripts/generate-school-slugs.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BATCH_SIZE = 100; // Process 100 schools at a time

function slugify(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function generateSchoolSlug(name, location) {
    if (!name) return '';
    const namePart = slugify(name);
    const locationPart = location ? slugify(location.split(',')[0]) : '';
    if (locationPart && !namePart.includes(locationPart)) {
        return `${namePart}-${locationPart}`;
    }
    return namePart;
}

async function main() {
    console.log('🚀 Starting slug generation (scalable version)...\n');

    // Get total count first (no memory issue)
    const totalCount = await prisma.schoolPublicProfile.count({
        where: { OR: [{ slug: null }, { slug: '' }] }
    });

    console.log(`📊 Found ${totalCount} schools without slugs\n`);

    if (totalCount === 0) {
        console.log('✅ All schools already have slugs!');
        return;
    }

    // Load existing slugs into a Set (these are small strings)
    const existingSlugs = await prisma.schoolPublicProfile.findMany({
        where: { slug: { not: null } },
        select: { slug: true }
    });
    const usedSlugs = new Set(existingSlugs.map(p => p.slug));

    let processed = 0;
    let successCount = 0;
    let errorCount = 0;

    // Process in batches using cursor-based pagination
    let cursor = undefined;

    while (processed < totalCount) {
        // Fetch a batch
        const profiles = await prisma.schoolPublicProfile.findMany({
            where: { OR: [{ slug: null }, { slug: '' }] },
            include: {
                school: { select: { name: true, location: true } }
            },
            take: BATCH_SIZE,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { id: 'asc' }
        });

        if (profiles.length === 0) break;

        // Prepare batch updates
        const updates = [];

        for (const profile of profiles) {
            let baseSlug = generateSchoolSlug(profile.school.name, profile.school.location);
            let slug = baseSlug;
            let counter = 2;

            while (usedSlugs.has(slug)) {
                slug = `${baseSlug}-${counter}`;
                counter++;
            }

            usedSlugs.add(slug);
            updates.push({
                id: profile.id,
                slug,
                name: profile.school.name
            });
        }

        // Execute batch update in a transaction
        try {
            await prisma.$transaction(
                updates.map(u =>
                    prisma.schoolPublicProfile.update({
                        where: { id: u.id },
                        data: { slug: u.slug }
                    })
                )
            );

            successCount += updates.length;
            updates.forEach(u => console.log(`✅ ${u.name} → ${u.slug}`));

        } catch (error) {
            errorCount += updates.length;
            console.error(`❌ Batch failed: ${error.message}`);
        }

        // Update cursor for next batch
        cursor = profiles[profiles.length - 1].id;
        processed += profiles.length;

        // Progress indicator
        const progress = Math.round((processed / totalCount) * 100);
        console.log(`\n📈 Progress: ${progress}% (${processed}/${totalCount})\n`);
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📈 Final Results:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(50));
}

main()
    .catch((e) => {
        console.error('Fatal error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
