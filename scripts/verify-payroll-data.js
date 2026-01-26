import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyPayrollApis() {
    console.log('--- Verifying Payroll APIs ---');

    try {
        // 1. Find a School
        const school = await prisma.school.findFirst();
        if (!school) {
            console.error('No school found in DB.');
            return;
        }
        console.log(`Using School: ${school.name} (${school.id})`);

        // 2. Find any Employee Payroll Profile
        // We want to see if we can get the related user data
        const profile = await prisma.employeePayrollProfile.findFirst({
            where: { schoolId: school.id },
            include: {
                user: {
                    include: {
                        teacher: true,
                        transportStaff: true
                    }
                }
            }
        });

        if (profile) {
            console.log(`\nTesting Teacher/Employee Payroll API for: ${profile.user.name}`);

            // Check Data Availability
            console.log(`Designation (Teacher): ${profile.user.teacher?.designation || 'N/A'}`);
            console.log(`Designation (Transport): ${profile.user.transportStaff?.designation || 'N/A'}`);
            console.log(`Bank Name: ${profile.bankName || 'MISSING'}`);
            console.log(`Account No: ${profile.accountNumber || 'MISSING'}`);
            console.log(`PAN: ${profile.panNumber || 'MISSING'}`);
            console.log(`Tax Regime: ${profile.taxRegime}`);

            if (profile.bankName && profile.accountNumber) {
                console.log('✅ Bank Details Data Present');
            } else {
                console.warn('⚠️ Bank Details missing in DB for this user');
            }
        } else {
            console.warn('No Employee Payroll Profile found.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

verifyPayrollApis();
