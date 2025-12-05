import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await request.json();
        const { classId, sectionId, examId, templateId } = body;

        if (!classId || !examId || !templateId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Parallel fetch: Exam, Template, Students
        const [exam, template, students] = await Promise.all([
            prisma.exam.findUnique({
                where: { id: examId },
                include: {
                    school: true,
                    subjects: {
                        include: {
                            subject: true
                        },
                        orderBy: {
                            date: 'asc'
                        }
                    }
                }
            }),
            prisma.documentTemplate.findFirst({
                where: { id: templateId, schoolId, templateType: 'admitcard' }
            }),
            prisma.student.findMany({
                where: {
                    schoolId,
                    classId: parseInt(classId),
                    ...(sectionId && sectionId !== 'ALL' && sectionId !== '' && { sectionId: parseInt(sectionId) }),
                },
                include: {
                    class: true,
                    section: true,
                    user: { select: { profilePicture: true } }
                },
                orderBy: { rollNumber: 'asc' }
            })
        ]);

        if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

        // Optimize student data payload
        const optimizedStudents = students.map(s => ({
            id: s.userId,
            name: s.name,
            rollNumber: s.rollNumber,
            admissionNo: s.admissionNo,
            className: s.class?.className,
            section: s.section?.name,
            dob: s.dob,
            fatherName: s.FatherName,
            motherName: s.MotherName,
            address: s.Address,
            photo: s.user?.profilePicture
        }));

        return NextResponse.json({
            exam: {
                id: exam.id,
                title: exam.title,
                startDate: exam.startDate,
                endDate: exam.endDate,
                subjects: exam.subjects // Include subjects for schedule table
            },
            template: {
                id: template.id,
                layoutConfig: template.layoutConfig
            },
            students: optimizedStudents,
            count: optimizedStudents.length
        });

    } catch (error) {
        console.error('Bulk Data Fetch Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
