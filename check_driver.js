const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const student = await prisma.student.findFirst({
    where: { name: { contains: "Krishna Kulkarni" } },
    include: {
      routeAssignments: {
        include: {
          route: {
            include: {
              vehicle: true,
              routeAssignments: true
            }
          }
        }
      }
    }
  });

  console.dir(student, { depth: null });
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
