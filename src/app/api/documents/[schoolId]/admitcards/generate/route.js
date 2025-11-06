import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateAdmitCardPDF } from '@/lib/pdf-generator-admitcard';

export async function POST(request, { params }) {
    try {
        const { schoolId } = params;
        const body = await request.json();

        const {
            studentId,
            examId,
            templateId,
            seatNumber,
            center,
            examDate,
            examTime,
            venue,
            issuedById,
        } = body;

        console.log('📝 Generate Admit Card Request:', { 
            studentId, 
            examId, 
            seatNumber, 
            schoolId 
        });

        // 1. Fetch student details
        const student = await prisma.student.findUnique({
            where: { userId: studentId },
            include: {
                class: true,
                section: true,
                school: true,
                user: {
                    select: {
                        profilePicture: true
                    }
                }
            },
        });

        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        // 2. Fetch exam details
        const exam = await prisma.exam.findUnique({
            where: { id: parseInt(examId) },
            include: {
                school: true,
            },
        });

        if (!exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        // 3. Fetch template
        const template = await prisma.documentTemplate.findFirst({
            where: {
                id: templateId,
                schoolId,
                templateType: 'admitcard',
                isActive: true,
            },
        });

        if (!template) {
            console.error('❌ Template not found');
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        console.log('✅ Template found:', template.name);

        // 4. Check if admit card already exists
        const existingAdmitCard = await prisma.admitCard.findFirst({
            where: {
                studentId,
                examId: parseInt(examId),
                schoolId,
            },
        });

        if (existingAdmitCard) {
            return NextResponse.json(
                { error: 'Admit card already exists for this student and exam' },
                { status: 400 }
            );
        }

        // 5. Convert logo to base64 if needed
        let layoutConfig = { ...template.layoutConfig };
        if (layoutConfig?.logoUrl && !layoutConfig.logoUrl.startsWith('data:')) {
            try {
                const response = await fetch(layoutConfig.logoUrl);
                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    const base64 = Buffer.from(buffer).toString("base64");
                    const mime = response.headers.get('content-type') || 'image/png';
                    layoutConfig.logoUrl = `data:${mime};base64,${base64}`;
                }
            } catch (error) {
                console.warn('⚠️ Failed to convert logo:', error.message);
            }
        }

        // 6. Convert signature to base64 if needed
        if (layoutConfig?.signatureUrl && !layoutConfig.signatureUrl.startsWith('data:')) {
            try {
                const response = await fetch(layoutConfig.signatureUrl);
                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    const base64 = Buffer.from(buffer).toString("base64");
                    const mime = response.headers.get('content-type') || 'image/png';
                    layoutConfig.signatureUrl = `data:${mime};base64,${base64}`;
                }
            } catch (error) {
                console.warn('⚠️ Failed to convert signature:', error.message);
            }
        }

        // 7. Convert student photo to base64 if needed
        if (student.user?.profilePicture && !student.user.profilePicture.startsWith('data:')) {
            try {
                const response = await fetch(student.user.profilePicture);
                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    const base64 = Buffer.from(buffer).toString("base64");
                    const mime = response.headers.get('content-type') || 'image/jpeg';
                    student.user.profilePicture = `data:${mime};base64,${base64}`;
                }
            } catch (error) {
                console.warn('⚠️ Failed to convert student photo:', error.message);
            }
        }

        // 8. Generate PDF and get URL
        console.log('📄 Generating PDF...');
        const pdfDataUrl = await generateAdmitCardPDF({
            template: { ...template, layoutConfig },
            student,
            exam,
            seatNumber,
            center,
            examDate,
            examTime,
            venue,
        });

        console.log('✅ PDF generated');

        // 9. Save admit card record WITH fileUrl
        const admitCard = await prisma.admitCard.create({
            data: {
                studentId,
                examId: parseInt(examId),
                schoolId,
                seatNumber,
                center: center || null,
                fileUrl: pdfDataUrl, // 🔥 IMPORTANT: Store the PDF URL
                layoutConfig: {
                    ...layoutConfig,
                    examDate,
                    examTime,
                    venue,
                },
                issueDate: new Date(),
            },
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
                        rollNumber: true,
                        admissionNo: true,
                        class: {
                            select: {
                                className: true,
                            },
                        },
                        section: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                exam: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        console.log('✅ Admit card saved:', admitCard.id);

        return NextResponse.json({
            id: admitCard.id,
            seatNumber: admitCard.seatNumber,
            center: admitCard.center,
            fileUrl: admitCard.fileUrl,
            issueDate: admitCard.issueDate,
            student: admitCard.student,
            exam: admitCard.exam,
            status: 'issued',
        }, { status: 201 });

    } catch (error) {
        console.error('❌ Error:', error);
        return NextResponse.json(
            { 
                error: 'Failed to generate admit card', 
                message: error.message,
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
            },
            { status: 500 }
        );
    }
}