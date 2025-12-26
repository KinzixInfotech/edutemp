/**
 * Script to add Director and Principal to existing school
 * Run with: node scripts/add-director-principal.js
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// Use direct connection URL to avoid pooler issues
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DIRECT_URL || process.env.DATABASE_URL,
        },
    },
});

// Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

// ============================================
// CONFIGURE THESE VALUES
// ============================================
const SCHOOL_NAME = 'DAV Public School';

const DIRECTOR_DATA = {
    name: 'Director Name',
    email: 'director@davschool.com',
    password: 'Director@123', // Change this password
};

const PRINCIPAL_DATA = {
    name: 'Principal Name',
    email: 'principal@davschool.com',
    password: 'Principal@123', // Change this password
};

// ============================================
// Main Script
// ============================================
async function addDirectorAndPrincipal() {
    try {
        console.log('🔍 Finding school:', SCHOOL_NAME);

        // 1. Find the school
        const school = await prisma.school.findFirst({
            where: {
                name: {
                    contains: SCHOOL_NAME,
                    mode: 'insensitive',
                },
            },
        });

        if (!school) {
            throw new Error(`School "${SCHOOL_NAME}" not found`);
        }

        console.log('✅ Found school:', school.name, '(ID:', school.id + ')');

        // 2. Create Director Supabase User
        console.log('\n📝 Creating Director in Supabase...');
        const { data: directorAuth, error: directorAuthError } =
            await supabase.auth.admin.createUser({
                email: DIRECTOR_DATA.email,
                password: DIRECTOR_DATA.password,
                email_confirm: true,
                user_metadata: {
                    name: DIRECTOR_DATA.name,
                    role: 'DIRECTOR',
                    schoolId: school.id,
                },
            });

        if (directorAuthError) {
            throw new Error(`Director Supabase error: ${directorAuthError.message}`);
        }

        console.log('✅ Director Supabase user created:', directorAuth.user.id);

        // 3. Create Principal Supabase User
        console.log('\n📝 Creating Principal in Supabase...');
        const { data: principalAuth, error: principalAuthError } =
            await supabase.auth.admin.createUser({
                email: PRINCIPAL_DATA.email,
                password: PRINCIPAL_DATA.password,
                email_confirm: true,
                user_metadata: {
                    name: PRINCIPAL_DATA.name,
                    role: 'PRINCIPAL',
                    schoolId: school.id,
                },
            });

        if (principalAuthError) {
            // Rollback director if principal fails
            await supabase.auth.admin.deleteUser(directorAuth.user.id);
            throw new Error(`Principal Supabase error: ${principalAuthError.message}`);
        }

        console.log('✅ Principal Supabase user created:', principalAuth.user.id);

        // 4. Create Prisma records in transaction (with increased timeout)
        console.log('\n📝 Creating database records...');
        const result = await prisma.$transaction(
            async (tx) => {
                // Ensure roles exist
                const [directorRole, principalRole] = await Promise.all([
                    tx.role.upsert({
                        where: { name: 'DIRECTOR' },
                        update: {},
                        create: { name: 'DIRECTOR' },
                    }),
                    tx.role.upsert({
                        where: { name: 'PRINCIPAL' },
                        update: {},
                        create: { name: 'PRINCIPAL' },
                    }),
                ]);

                // Create Director user (lowercase 'director')
                const directorUser = await tx.user.create({
                    data: {
                        id: directorAuth.user.id,
                        name: DIRECTOR_DATA.name,
                        email: DIRECTOR_DATA.email,
                        password: DIRECTOR_DATA.password,
                        schoolId: school.id,
                        roleId: directorRole.id,
                        director: {
                            // lowercase!
                            create: {
                                schoolId: school.id,
                            },
                        },
                    },
                });

                // Create Principal user (lowercase 'principal')
                const principalUser = await tx.user.create({
                    data: {
                        id: principalAuth.user.id,
                        name: PRINCIPAL_DATA.name,
                        email: PRINCIPAL_DATA.email,
                        password: PRINCIPAL_DATA.password,
                        schoolId: school.id,
                        roleId: principalRole.id,
                        principal: {
                            // lowercase!
                            create: {
                                schoolId: school.id,
                            },
                        },
                    },
                });

                return { directorUser, principalUser };
            },
            {
                maxWait: 10000, // 10 seconds max wait
                timeout: 15000, // 15 seconds timeout
            }
        );

        console.log('✅ Director database record created:', result.directorUser.id);
        console.log('✅ Principal database record created:', result.principalUser.id);

        console.log('\n🎉 SUCCESS! Director and Principal added to', school.name);
        console.log('\n📧 Login Credentials:');
        console.log('─────────────────────────────────────');
        console.log('DIRECTOR:');
        console.log('  Email:', DIRECTOR_DATA.email);
        console.log('  Password:', DIRECTOR_DATA.password);
        console.log('\nPRINCIPAL:');
        console.log('  Email:', PRINCIPAL_DATA.email);
        console.log('  Password:', PRINCIPAL_DATA.password);
        console.log('─────────────────────────────────────');
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
addDirectorAndPrincipal()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
