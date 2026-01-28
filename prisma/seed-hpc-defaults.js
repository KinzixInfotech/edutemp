// Default SEL Parameters Seeder for NEP 2020 HPC
// Run: node prisma/seed-sel-parameters.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEFAULT_SEL_PARAMETERS = [
    // Behavioral
    { name: "Discipline", category: "Behavioral", description: "Adheres to school rules and maintains orderly conduct", order: 1 },
    { name: "Responsibility", category: "Behavioral", description: "Takes ownership of tasks and commitments", order: 2 },
    { name: "Punctuality", category: "Behavioral", description: "Arrives on time and meets deadlines", order: 3 },

    // Social
    { name: "Collaboration", category: "Social", description: "Works effectively with peers in group settings", order: 4 },
    { name: "Communication", category: "Social", description: "Expresses ideas clearly and listens actively", order: 5 },
    { name: "Empathy", category: "Social", description: "Shows understanding and compassion for others", order: 6 },
    { name: "Respect", category: "Social", description: "Treats others with dignity and courtesy", order: 7 },

    // Emotional
    { name: "Self-Awareness", category: "Emotional", description: "Understands own strengths and areas for improvement", order: 8 },
    { name: "Emotional Regulation", category: "Emotional", description: "Manages emotions appropriately in various situations", order: 9 },
    { name: "Resilience", category: "Emotional", description: "Bounces back from setbacks and challenges", order: 10 },

    // Cognitive
    { name: "Critical Thinking", category: "Cognitive", description: "Analyzes information and makes reasoned judgments", order: 11 },
    { name: "Creativity", category: "Cognitive", description: "Generates innovative ideas and solutions", order: 12 },
    { name: "Curiosity", category: "Cognitive", description: "Shows eagerness to learn and explore", order: 13 }
];

const DEFAULT_COMPETENCIES = {
    // These are common competencies applicable to most subjects
    "General": [
        { name: "Conceptual Understanding", description: "Grasps core concepts and principles", order: 1 },
        { name: "Application", description: "Applies knowledge to solve problems", order: 2 },
        { name: "Critical Analysis", description: "Analyzes and evaluates information", order: 3 },
        { name: "Communication", description: "Expresses understanding clearly", order: 4 },
        { name: "Collaboration", description: "Works effectively with others", order: 5 }
    ]
};

const DEFAULT_ACTIVITY_CATEGORIES = [
    { name: "Sports & Physical Education", icon: "🏃", description: "Athletic and physical activities" },
    { name: "Arts & Culture", icon: "🎨", description: "Visual arts, music, dance, and cultural activities" },
    { name: "Literary Activities", icon: "📚", description: "Debate, elocution, creative writing" },
    { name: "Science & Technology", icon: "🔬", description: "Science clubs, robotics, coding" },
    { name: "Community Service", icon: "🤝", description: "Social service and volunteer work" },
    { name: "Leadership", icon: "👑", description: "Student council, prefect duties, event organization" }
];

async function seedSchoolHPCDefaults(schoolId) {
    console.log(`Seeding HPC defaults for school: ${schoolId}`);

    try {
        // Seed SEL Parameters
        console.log("Creating SEL parameters...");
        for (const param of DEFAULT_SEL_PARAMETERS) {
            await prisma.sELParameter.upsert({
                where: { schoolId_name: { schoolId, name: param.name } },
                update: {},
                create: { schoolId, ...param }
            });
        }
        console.log(`✅ Created ${DEFAULT_SEL_PARAMETERS.length} SEL parameters`);

        // Seed Activity Categories
        console.log("Creating activity categories...");
        for (const cat of DEFAULT_ACTIVITY_CATEGORIES) {
            await prisma.activityCategory.upsert({
                where: { schoolId_name: { schoolId, name: cat.name } },
                update: {},
                create: { schoolId, ...cat, order: DEFAULT_ACTIVITY_CATEGORIES.indexOf(cat) }
            });
        }
        console.log(`✅ Created ${DEFAULT_ACTIVITY_CATEGORIES.length} activity categories`);

        console.log("✅ HPC defaults seeded successfully!");
    } catch (error) {
        console.error("Error seeding HPC defaults:", error);
        throw error;
    }
}

// Run for all schools or a specific school
async function main() {
    const schoolId = process.argv[2];

    if (schoolId) {
        // Seed specific school
        await seedSchoolHPCDefaults(schoolId);
    } else {
        // Seed all active schools
        console.log("Seeding HPC defaults for all schools...");
        const schools = await prisma.school.findMany({ select: { id: true, name: true } });

        for (const school of schools) {
            console.log(`\n--- ${school.name} ---`);
            await seedSchoolHPCDefaults(school.id);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
