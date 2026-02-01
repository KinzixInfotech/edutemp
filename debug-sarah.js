const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SCHOOL_ID = 'a1439aed-c6bc-4239-a19c-532a153f5b8f';

async function main() {
    console.log('\n=== CHECKING MARCH 2026 PAYROLL PERIOD ===\n');

    // Find March 2026 period
    const period = await prisma.payrollPeriod.findFirst({
        where: {
            schoolId: SCHOOL_ID,
            month: 3,
            year: 2026
        },
        include: {
            payrollItems: {
                include: {
                    employee: {
                        include: { user: { select: { name: true } } }
                    }
                }
            }
        }
    });

    if (!period) {
        console.log('No March 2026 period found!');
        return;
    }

    console.log(`Period ID: ${period.id}`);
    console.log(`Status: ${period.status}`);
    console.log(`Total Payroll Items: ${period.payrollItems.length}`);
    console.log(`ProcessedAt: ${period.processedAt}`);

    console.log('\n--- Employees in PayrollItems ---');
    period.payrollItems.forEach((item, i) => {
        console.log(`${i + 1}. ${item.employee?.user?.name}`);
        console.log(`   - employeeId: ${item.employeeId}`);
        console.log(`   - readiness: ${item.readiness}`);
        console.log(`   - grossEarnings: ${item.grossEarnings}`);
        console.log(`   - netSalary: ${item.netSalary}`);
    });

    // Check if Sarah's payrollItem exists
    const sarahItem = period.payrollItems.find(item =>
        item.employee?.user?.name?.toLowerCase().includes('sarah')
    );

    console.log(`\nSarah in payrollItems: ${sarahItem ? 'YES' : 'NO'}`);

    if (!sarahItem) {
        // Try to find her payrollItem directly
        const sarahEmployee = await prisma.employeePayrollProfile.findFirst({
            where: {
                schoolId: SCHOOL_ID,
                user: { name: { contains: 'Sarah' } }
            }
        });

        if (sarahEmployee) {
            console.log(`\nSarah's Employee ID: ${sarahEmployee.id}`);

            const directItem = await prisma.payrollItem.findUnique({
                where: {
                    periodId_employeeId: {
                        periodId: period.id,
                        employeeId: sarahEmployee.id
                    }
                }
            });

            console.log(`Direct PayrollItem lookup: ${directItem ? 'FOUND' : 'NOT FOUND'}`);
            if (directItem) {
                console.log(JSON.stringify(directItem, null, 2));
            }
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
