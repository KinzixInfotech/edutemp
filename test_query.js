const { PrismaClient } = require('/Users/manshajami/Documents/edutemp/src/app/generated/prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teacher = await prisma.teachingStaff.findFirst({
    where: { user: { email: 'admin@xavier.com' } },
    include: {
        sectionsAssigned: {
            include: {
                class: true
            }
        },
        user: true
    }
  });
  console.log(JSON.stringify(teacher?.sectionsAssigned, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
