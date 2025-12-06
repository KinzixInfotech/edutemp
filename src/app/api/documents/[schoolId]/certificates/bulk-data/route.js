import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await request.json();
        const { classId, sectionId, templateId } = body;

        if (!classId || !templateId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Parallel fetch: Template, Students
        const [template, students] = await Promise.all([
            prisma.documentTemplate.findFirst({
                where: { id: templateId, schoolId }
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
            photo: s.user?.profilePicture,
            // Additional fields often used in certificates
            gender: s.gender,
            contactNumber: s.contactNumber
        }));

        return NextResponse.json({
            template: {
                id: template.id,
                layoutConfig: template.layoutConfig,
                name: template.name,
                type: template.type
            },
            students: optimizedStudents,
            count: optimizedStudents.length
        });

    } catch (error) {
        console.error('Bulk Data Fetch Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
