const { PrismaClient } = require("../src/app/generated/prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrate() {
    console.log("Starting Subject Data Migration...");
    
    // Fetch all existing subjects with their school info via class
    const subjects = await prisma.subject.findMany({
        where: { globalSubjectId: null },
        include: {
            class: { select: { schoolId: true } }
        }
    });

    if (subjects.length === 0) {
        console.log("No unmapped subjects found.");
        return;
    }

    console.log(`Found ${subjects.length} unmapped subjects. Resolving Globals...`);

    const globalsMap = new Map(); // key: "schoolId_subjectName" -> globalSubjectId

    for (const sub of subjects) {
        const schoolId = sub.class.schoolId;
        const nameKey = sub.subjectName.trim().toLowerCase();
        const mapKey = `${schoolId}_${nameKey}`;

        let globalId = globalsMap.get(mapKey);

        if (!globalId) {
            let globalSub = await prisma.globalSubject.findFirst({
                where: {
                    schoolId: schoolId,
                    name: { equals: sub.subjectName, mode: 'insensitive' }
                }
            });

            if (!globalSub) {
                globalSub = await prisma.globalSubject.create({
                    data: {
                        name: sub.subjectName,
                        code: sub.subjectCode || null,
                        type: "CORE",
                        schoolId: schoolId
                    }
                });
                console.log(`Created Master Subject: ${globalSub.name}`);
            }
            
            globalId = globalSub.id;
            globalsMap.set(mapKey, globalId);
        }

        await prisma.subject.update({
            where: { id: sub.id },
            data: { globalSubjectId: globalId, isOptional: false }
        });
        console.log(`Mapped Subject ID ${sub.id} (${sub.subjectName}) to Master ID ${globalId}`);
    }

    console.log("Migration completed successfully!");
}

migrate()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
