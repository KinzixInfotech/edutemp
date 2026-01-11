/**
 * Sync Database User IDs with Supabase Auth IDs
 * 
 * This script finds users in the database whose IDs don't match Supabase
 * and updates them to match (by looking up the email in Supabase).
 * 
 * Run with: node scripts/sync-user-ids.js
 */

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncUserIds() {
    console.log('🔄 Starting user ID sync...\n');

    // Get all users from database
    const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true }
    });

    console.log(`Found ${users.length} users in database\n`);

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
        try {
            // Look up user in Supabase by email
            const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();

            if (error) {
                console.log(`❌ Error fetching Supabase users: ${error.message}`);
                continue;
            }

            const supabaseUser = authUsers.users.find(u => u.email === user.email);

            if (!supabaseUser) {
                // User not in Supabase, skip
                skipped++;
                continue;
            }

            if (supabaseUser.id === user.id) {
                // IDs already match
                skipped++;
                continue;
            }

            // IDs don't match - update database
            console.log(`📝 Updating user: ${user.email}`);
            console.log(`   DB ID:       ${user.id}`);
            console.log(`   Supabase ID: ${supabaseUser.id}`);

            await prisma.user.update({
                where: { id: user.id },
                data: { id: supabaseUser.id }
            });

            console.log(`   ✅ Updated!\n`);
            synced++;

        } catch (err) {
            console.log(`❌ Error syncing ${user.email}: ${err.message}\n`);
            errors++;
        }
    }

    console.log('\n===== SYNC COMPLETE =====');
    console.log(`✅ Synced:  ${synced}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors:  ${errors}`);
}

// Load env and run
require('dotenv').config();
syncUserIds()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
