// Seed script for SMS templates
// Run: node prisma/seed-sms-templates.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const dummyTemplates = [
    {
        name: 'Attendance Absent Notification',
        dltTemplateId: 'DUMMY-ATT-001',
        content: 'Dear {PARENT_NAME}, your child {STUDENT_NAME} of class {CLASS_NAME} was marked absent on {DATE}. Please ensure regular attendance. Regards, {SCHOOL_NAME}',
        variables: ['PARENT_NAME', 'STUDENT_NAME', 'CLASS_NAME', 'DATE', 'SCHOOL_NAME'],
        category: 'ATTENDANCE',
        isActive: true,
    },
    {
        name: 'Fee Payment Reminder',
        dltTemplateId: 'DUMMY-FEE-001',
        content: 'Dear {PARENT_NAME}, fee of Rs.{AMOUNT} for {STUDENT_NAME} is due on {DUE_DATE}. Please pay to avoid late fee charges. - {SCHOOL_NAME}',
        variables: ['PARENT_NAME', 'AMOUNT', 'STUDENT_NAME', 'DUE_DATE', 'SCHOOL_NAME'],
        category: 'FEE_REMINDER',
        isActive: true,
    },
    {
        name: 'Fee Overdue Notice',
        dltTemplateId: 'DUMMY-FEE-002',
        content: 'Dear {PARENT_NAME}, fee payment of Rs.{AMOUNT} for {STUDENT_NAME} is overdue. Please clear the dues immediately to avoid further action. - {SCHOOL_NAME}',
        variables: ['PARENT_NAME', 'AMOUNT', 'STUDENT_NAME', 'SCHOOL_NAME'],
        category: 'FEE_REMINDER',
        isActive: true,
    },
    {
        name: 'OTP Login',
        dltTemplateId: 'DUMMY-OTP-001',
        content: 'Your OTP for EduBreezy login is {OTP}. Valid for 10 minutes. Do not share this with anyone.',
        variables: ['OTP'],
        category: 'OTP',
        isActive: true,
    },
    {
        name: 'Holiday Announcement',
        dltTemplateId: 'DUMMY-HOL-001',
        content: 'Dear Parent, school will remain closed on {DATE} for {REASON}. Classes will resume on {RESUME_DATE}. - {SCHOOL_NAME}',
        variables: ['DATE', 'REASON', 'RESUME_DATE', 'SCHOOL_NAME'],
        category: 'HOLIDAY',
        isActive: true,
    },
    {
        name: 'General Notice',
        dltTemplateId: 'DUMMY-NOT-001',
        content: 'Dear {PARENT_NAME}, {MESSAGE}. For queries, contact school office. Regards, {SCHOOL_NAME}',
        variables: ['PARENT_NAME', 'MESSAGE', 'SCHOOL_NAME'],
        category: 'NOTICE',
        isActive: true,
    },
    {
        name: 'Exam Schedule Notice',
        dltTemplateId: 'DUMMY-NOT-002',
        content: 'Dear Parent, {EXAM_NAME} for class {CLASS_NAME} will commence from {START_DATE}. Please ensure your child is well prepared. - {SCHOOL_NAME}',
        variables: ['EXAM_NAME', 'CLASS_NAME', 'START_DATE', 'SCHOOL_NAME'],
        category: 'NOTICE',
        isActive: true,
    },
    {
        name: 'PTM Reminder',
        dltTemplateId: 'DUMMY-NOT-003',
        content: 'Dear {PARENT_NAME}, Parent-Teacher Meeting for {STUDENT_NAME} is scheduled on {DATE} at {TIME}. Your presence is important. - {SCHOOL_NAME}',
        variables: ['PARENT_NAME', 'STUDENT_NAME', 'DATE', 'TIME', 'SCHOOL_NAME'],
        category: 'NOTICE',
        isActive: true,
    },
    {
        name: 'Notice with Link',
        dltTemplateId: 'DUMMY-LINK-001',
        content: 'Dear Parent, please view the notice at {LINK}. For queries, contact school. Regards, {SCHOOL_NAME}',
        variables: ['LINK', 'SCHOOL_NAME'],
        category: 'NOTICE',
        isActive: true,
    },
];

async function seedTemplates() {
    console.log('🌱 Seeding SMS templates...\n');

    for (const template of dummyTemplates) {
        try {
            // Check if template already exists
            const existing = await prisma.smsTemplate.findUnique({
                where: { dltTemplateId: template.dltTemplateId },
            });

            if (existing) {
                console.log(`⏭️  Template "${template.name}" already exists, skipping...`);
                continue;
            }

            await prisma.smsTemplate.create({
                data: template,
            });

            console.log(`✅ Created template: ${template.name}`);
        } catch (error) {
            console.error(`❌ Failed to create template "${template.name}":`, error.message);
        }
    }

    console.log('\n🎉 SMS templates seeding complete!');
}

seedTemplates()
    .catch((e) => {
        console.error('Error seeding templates:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
