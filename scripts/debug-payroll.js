import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    const schoolId = 'a1439aed-c6bc-4239-a19c-532a153f5b8f';
    console.log(`Checking staff for school: ${schoolId}`);

    try {
        const teachingStaff = await prisma.teachingStaff.findMany({
            where: {
                schoolId,
                user: { status: 'ACTIVE' }
            },
            select: {
                userId: true,
                user: { select: { status: true, createdAt: true } }
            }
        });
        console.log(`Teaching Staff found (ACTIVE): ${teachingStaff.length}`);
        if (teachingStaff.length > 0) {
            console.log('Sample Teaching Staff:', JSON.stringify(teachingStaff[0], null, 2));
        }

        const nonTeachingStaff = await prisma.nonTeachingStaff.findMany({
            where: {
                schoolId,
                user: { status: 'ACTIVE' }
            },
            select: {
                userId: true,
                user: { select: { status: true, createdAt: true } }
            }
        });
        console.log(`Non-Teaching Staff found (ACTIVE): ${nonTeachingStaff.length}`);

        // Check without status filter
        const allTeaching = await prisma.teachingStaff.count({ where: { schoolId } });
        console.log(`Total Teaching Staff (no filter): ${allTeaching}`);

        // Check existing profiles
        const profiles = await prisma.employeePayrollProfile.findMany({
            where: { schoolId }
        });
        console.log(`Existing Payroll Profiles: ${profiles.length}`);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
