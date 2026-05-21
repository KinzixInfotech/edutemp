const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  
  if (schools.length > 0) {
    const sId = schools[0].id;
    const academicYears = await prisma.academicYear.findMany({ where: { schoolId: sId } });
    console.log("Academic Years:", JSON.stringify(academicYears, null, 2));
    
    const importBatches = await prisma.importBatch.findMany({ where: { schoolId: sId, module: 'students' }, orderBy: { createdAt: 'desc' }, take: 2 });
    console.log("Import Batches:", JSON.stringify(importBatches, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
