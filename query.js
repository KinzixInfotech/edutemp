const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const studentFee = await prisma.studentFee.findUnique({
        where: { id: '0ce1133e-b03d-4019-b8ce-bf387293c9d5' },
        include: {
            session: true,
            globalFeeStructure: { include: { particulars: true } }
        }
    });
    console.log(JSON.stringify(studentFee, null, 2));
}
run();
