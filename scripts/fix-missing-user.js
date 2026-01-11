
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Fixing Missing User ---');

    const userId = 'a98391d7-a86f-4ebf-8017-55d7786ef014';
    const schoolId = '4048cc40-d2d8-4e75-8419-41ff2283daf7'; // From logs
    const userEmail = 'sarah1@school.com'; // From logs
    const userName = 'Dr. Sarah Johnson'; // From logs

    try {
        // 1. Ensure School exists (or find one)
        let school = await prisma.school.findFirst({ where: { id: schoolId } });
        if (!school) {
            console.log('School not found, creating dummy school...');
            school = await prisma.school.create({
                data: {
                    id: schoolId,
                    name: 'Angels High School',
                    schoolCode: 'EB-00001',
                    email: 'school@test.com',
                    phone: '1234567890',
                    address: '123 Test St',

                    // Required fields from schema
                    domain: 'test-school.edubreezy.com',
                    profilePicture: 'default-school.png',
                    location: 'Test Location',
                    contactNumber: '1234567890',
                    SubscriptionType: 'STANDARD',
                    Language: 'ENGLISH'
                }
            });
        }

        // 2. Ensure Role exists
        const role = await prisma.role.findFirst({ where: { name: 'TEACHING_STAFF' } });
        if (!role) {
            throw new Error('Role TEACHING_STAFF not found. Please seed roles first.');
        }

        // 3. Create User
        const user = await prisma.user.create({
            data: {
                id: userId,
                email: userEmail,
                name: userName,
                password: 'hashed_password_placeholder', // Supabase handles actual auth
                schoolId: school.id,
                roleId: role.id,
                status: 'ACTIVE'
            }
        });

        console.log(`✅ User created successfully in public.User table!`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);

    } catch (e) {
        console.log('❌ Error creating user:', e.message);
    }

    console.log('--- End Fix ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
