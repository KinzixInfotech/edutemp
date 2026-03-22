// Quick script to revert the wizard's damage
// Run with: node /tmp/revert-session.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function revert() {
    try {
        // Find the school
        const school = await prisma.school.findFirst();
        if (!school) { console.log("No school found"); return; }
        console.log("School:", school.id, school.name);

        // Get all academic years
        const years = await prisma.academicYear.findMany({
            where: { schoolId: school.id },
            orderBy: { startDate: 'asc' },
        });
        console.log("\nAcademic Years:");
        for (const y of years) {
            console.log(`  ${y.name}: isActive=${y.isActive}, setupComplete=${y.setupComplete}, id=${y.id}`);
        }

        // Check class academicYearId distribution
        const classCounts = await prisma.$queryRaw`
            SELECT "academicYearId", COUNT(*) as count 
            FROM "Class" 
            WHERE "schoolId" = ${school.id}::uuid 
            GROUP BY "academicYearId"
        `;
        console.log("\nClass distribution by academicYearId:");
        for (const row of classCounts) {
            console.log(`  academicYearId=${row.academicYearId || 'NULL'}: ${row.count} classes`);
        }

        // Check student academicYearId distribution
        const studentCounts = await prisma.$queryRaw`
            SELECT "academicYearId", COUNT(*) as count 
            FROM "Student" 
            WHERE "schoolId" = ${school.id}::uuid 
            GROUP BY "academicYearId"
        `;
        console.log("\nStudent distribution by academicYearId:");
        for (const row of studentCounts) {
            console.log(`  academicYearId=${row.academicYearId || 'NULL'}: ${row.count} students`);
        }

        // Find the years
        const year2025 = years.find(y => y.name.includes('2025'));
        const year2026 = years.find(y => y.name.includes('2026'));

        if (year2025 && year2026) {
            console.log("\n--- REVERTING ---");
            
            // Revert: make 2025-26 active again, 2026-27 inactive
            await prisma.academicYear.update({
                where: { id: year2025.id },
                data: { isActive: true },
            });
            await prisma.academicYear.update({
                where: { id: year2026.id },
                data: { isActive: false, setupComplete: false },
            });

            // Delete any classes that were cloned into 2026-27
            const clonedClasses = await prisma.class.findMany({
                where: { schoolId: school.id, academicYearId: year2026.id },
            });
            if (clonedClasses.length > 0) {
                console.log(`Deleting ${clonedClasses.length} cloned classes from 2026-27...`);
                // Delete sections first
                await prisma.section.deleteMany({
                    where: { classId: { in: clonedClasses.map(c => c.id) } },
                });
                await prisma.class.deleteMany({
                    where: { schoolId: school.id, academicYearId: year2026.id },
                });
            }

            console.log("✅ Reverted successfully!");
            console.log("   2025-26 is now ACTIVE");
            console.log("   2026-27 is now INACTIVE (ready for wizard)");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await prisma.$disconnect();
    }
}

revert();
