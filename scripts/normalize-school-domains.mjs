import { PrismaClient } from '../src/app/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { isLegacyTenantDomain, normalizeSchoolDomain } from '../src/lib/school-domain.js';

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
});

const prisma = new PrismaClient({ adapter });

async function main() {
    const schools = await prisma.school.findMany({
        select: {
            id: true,
            name: true,
            domain: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    const toUpdate = schools
        .map((school) => ({
            ...school,
            normalizedDomain: normalizeSchoolDomain(school.domain),
        }))
        .filter((school) => school.domain !== school.normalizedDomain && isLegacyTenantDomain(school.domain));

    for (const school of toUpdate) {
        await prisma.school.update({
            where: { id: school.id },
            data: { domain: school.normalizedDomain },
        });
    }

    console.log(JSON.stringify({
        totalSchools: schools.length,
        updatedSchools: toUpdate.map(({ id, name, domain, normalizedDomain }) => ({
            id,
            name,
            from: domain,
            to: normalizedDomain,
        })),
    }, null, 2));
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
