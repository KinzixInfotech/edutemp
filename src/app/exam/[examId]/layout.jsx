import prisma from '@/lib/prisma';

export async function generateMetadata({ params }) {
    const { examId } = await params;

    try {
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
            select: {
                title: true,
                school: {
                    select: {
                        name: true,
                        profilePicture: true
                    }
                }
            }
        });

        if (!exam) {
            return {
                title: 'Exam Not Found | EduBreezy',
                description: 'The requested examination could not be found.'
            };
        }

        const schoolName = exam.school?.name || 'School';
        const examTitle = exam.title || 'Online Exam';

        return {
            title: `${examTitle} | ${schoolName}`,
            description: `Take the online examination: ${examTitle} at ${schoolName}. Secure exam portal powered by EduBreezy.`,
            openGraph: {
                title: `${examTitle} | ${schoolName}`,
                description: `Online Examination Portal - ${examTitle}`,
                type: 'website',
                images: exam.school?.profilePicture ? [exam.school.profilePicture] : []
            },
            twitter: {
                card: 'summary',
                title: `${examTitle} | ${schoolName}`,
                description: `Online Examination Portal - ${examTitle}`
            }
        };
    } catch (error) {
        console.error('Error generating metadata:', error);
        return {
            title: 'Online Exam | EduBreezy',
            description: 'Secure online examination portal'
        };
    }
}

export default function ExamLayout({ children }) {
    return children;
}
