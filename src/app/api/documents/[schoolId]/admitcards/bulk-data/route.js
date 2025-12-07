import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await request.json();
        const { classId, sectionId, examId, templateId, feePaidMonth } = body;

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

        // Filter by fee payment if feePaidMonth is specified
        let filteredStudents = students;
        if (feePaidMonth && feePaidMonth !== '') {
            const monthNum = parseInt(feePaidMonth);
            const currentYear = new Date().getFullYear();

            // Get students who have paid up to the specified month
            const feeRecords = await prisma.feePayment.findMany({
                where: {
                    schoolId,
                    studentId: { in: students.map(s => s.userId) },
                    status: 'COMPLETED',
                },
                select: {
                    studentId: true,
                    paidAmount: true,
                    paidAt: true,
                }
            });

            // Group payments by student and check if they've paid up to the month
            const paidStudentIds = new Set();
            const studentPayments = {};

            feeRecords.forEach(record => {
                if (!studentPayments[record.studentId]) {
                    studentPayments[record.studentId] = [];
                }
                studentPayments[record.studentId].push(record);
            });

            // Consider student "paid up to month" if they have any completed payment
            // A more sophisticated logic could check specific month coverage
            Object.keys(studentPayments).forEach(studentId => {
                const payments = studentPayments[studentId];
                // For now: if student has any payment, consider them fee-cleared
                // You can enhance this to check actual month coverage
                if (payments.length > 0 && payments.some(p => p.paidAmount > 0)) {
                    paidStudentIds.add(studentId);
                }
            });

            filteredStudents = students.filter(s => paidStudentIds.has(s.userId));
        }

        // Optimize student data payload
        const optimizedStudents = filteredStudents.map(s => ({
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
                subjects: exam.subjects
            },
            template: {
                id: template.id,
                layoutConfig: template.layoutConfig
            },
            students: optimizedStudents,
            count: optimizedStudents.length,
            filtered: feePaidMonth ? true : false,
            originalCount: students.length,
        });

    } catch (error) {
        console.error('Bulk Data Fetch Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
