import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  console.log("Schools:", schools);
  
  if (schools.length > 0) {
    const sId = schools[0].id;
    const academicYears = await prisma.academicYear.findMany({ where: { schoolId: sId } });
    console.log("Academic Years:", academicYears);
    
    const importBatches = await prisma.importBatch.findMany({ where: { schoolId: sId }, orderBy: { createdAt: 'desc' }, take: 5, include: { history: true } });
    console.log("Import Batches:", JSON.stringify(importBatches, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
