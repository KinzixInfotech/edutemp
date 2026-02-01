import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Period ID from user screenshot
    const periodId = '3a47382e-3927-4e84-92ed-bc480eb92423';
    console.log(`Debug Script: Processing Period ${periodId}`);

    try {
        const period = await prisma.payrollPeriod.findUnique({
            where: { id: periodId },
        });

        if (!period) {
            console.error("Period not found");
            return;
        }

        console.log(`Found Period: ${period.month}/${period.year}, SchoolId: ${period.schoolId}`);

        // Find Sarah Johnson
        const sarah = await prisma.employeePayrollProfile.findFirst({
            where: {
                schoolId: period.schoolId,
                user: {
                    name: { contains: 'Sarah Johnson' }
                }
            },
            include: {
                user: true,
                salaryStructure: true
            }
        });

        if (!sarah) {
            console.error("Sarah Johnson not found");
            return;
        }

        console.log(`Found Employee: ${sarah.user.name} (${sarah.id})`);
        console.log(`Is Active: ${sarah.isActive}`);
        console.log(`Structure: ${sarah.salaryStructure?.name}`);

        // Simulate Process Logic
        try {
            const employee = sarah;
            const schoolId = period.schoolId;

            // Readiness Logic
            let readiness = 'READY';
            let holdReason = null;

            if (!employee.salaryStructure) {
                readiness = 'SKIPPED_NO_STRUCTURE';
                holdReason = 'No salary structure assigned';
            }

            // Check Bank
            const hasBankDetails = employee.accountNumber && employee.ifscCode;
            if (!hasBankDetails) {
                // readiness = 'ON_HOLD_BANK'; // Commenting out to see if this is the issue
            }

            console.log(`Readiness: ${readiness}`);

            // Upsert Simulation
            const payrollItemData = {
                periodId: period.id,
                employeeId: employee.id,
                readiness: readiness,
                holdReason: holdReason,
                netSalary: 0,
                grossEarnings: 0,
                totalDeductions: 0,
                daysWorked: 0,
                paymentStatus: 'PENDING'
            };

            console.log("Attempting Upsert with Data:", JSON.stringify(payrollItemData, null, 2));

            const result = await prisma.payrollItem.upsert({
                where: {
                    periodId_employeeId: {
                        periodId: period.id,
                        employeeId: employee.id
                    }
                },
                update: payrollItemData,
                create: payrollItemData
            });

            console.log("Upsert Success!", result);

        } catch (error) {
            console.error("PROCESSING ERROR:", error);
            console.error("Stack:", error.stack);
        }

    } catch (e) {
        console.error("Script Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
