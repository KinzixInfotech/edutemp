const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Deleting all AdmissionForm and FormField data...');

    // Delete in order to avoid foreign key constraints
    await prisma.applicationDocument.deleteMany({});
    await prisma.payment.deleteMany({ where: { applicationId: { not: null } } });
    await prisma.stageHistory.deleteMany({});
    await prisma.application.deleteMany({});
    await prisma.formField.deleteMany({});
    await prisma.admissionForm.deleteMany({});

    console.log('Data deleted.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
