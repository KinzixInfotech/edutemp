const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const attempts = await prisma.studentExamAttempt.findMany({
            take: 5,
            include: {
                exam: true,
                student: {
                    include: {
                        class: true
                    }
                }
            },
            orderBy: {
                startTime: 'desc'
            }
        });

        console.log("Found attempts:", attempts.length);
        attempts.forEach(attempt => {
            console.log(`Attempt ID: ${attempt.id}`);
            console.log(`Exam ID: ${attempt.examId}, Title: ${attempt.exam.title}`);
            console.log(`Student ID: ${attempt.studentId}, Name: ${attempt.student.name}`);
            console.log(`Class ID: ${attempt.student.classId}, Class: ${attempt.student.class?.className}`);
            console.log("-----------------------------------");
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
