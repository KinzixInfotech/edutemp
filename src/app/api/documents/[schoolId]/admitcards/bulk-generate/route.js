// app/api/documents/[schoolId]/admitcards/bulk-generate/route.js

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateAdmitCardPDF } from '@/lib/admitcard-pdf-generator';
import archiver from 'archiver';
import { Readable } from 'stream';

export async function POST(request, { params }) {
    try {
        const { schoolId } = params;
        const body = await request.json();

        const {
            examId,
            classId,
            sectionId,
            templateId,
            examDate,
            examTime,
            center,
            venue,
            seatNumberPrefix,
            startingSeatNumber,
            issuedById,
        } = body;

        console.log('📝 Bulk Generate Request:', { 
            examId, 
            classId, 
            sectionId, 
            schoolId 
        });

        // 1. Fetch exam
        const exam = await prisma.exam.findUnique({
            where: { id: parseInt(examId) },
            include: {
                school: true,
            },
        });

        if (!exam) {
            return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
        }

        // 2. Fetch template
        const template = await prisma.documentTemplate.findFirst({
            where: {
                id: templateId,
                schoolId,
                templateType: 'admitcard',
                isActive: true,
            },
        });

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        // 3. Fetch students
        const whereClause = {
            schoolId,
            classId: parseInt(classId),
            ...(sectionId && { sectionId: parseInt(sectionId) }),
        };

        const students = await prisma.student.findMany({
            where: whereClause,
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
            orderBy: {
                rollNumber: 'asc',
            },
        });

        if (students.length === 0) {
            return NextResponse.json(
                { error: 'No students found for the selected class/section' },
                { status: 404 }
            );
        }

        console.log(`✅ Found ${students.length} students`);

        // 4. Convert logo to base64
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

        // 5. Generate admit cards for all students
        const results = {
            successCount: 0,
            failedCount: 0,
            admitCards: [],
            errors: [],
        };

        let currentSeatNumber = startingSeatNumber || 1;

        for (const student of students) {
            try {
                const seatNumber = `${seatNumberPrefix || ''}${currentSeatNumber}`;

                // Check if admit card already exists
                const existingAdmitCard = await prisma.admitCard.findFirst({
                    where: {
                        studentId: student.userId,
                        examId: parseInt(examId),
                        schoolId,
                    },
                });

                if (existingAdmitCard) {
                    results.errors.push({
                        studentId: student.userId,
                        studentName: student.name,
                        error: 'Admit card already exists',
                    });
                    results.failedCount++;
                    currentSeatNumber++;
                    continue;
                }

                // Generate PDF
                const pdfUrl = await generateAdmitCardPDF({
                    template: { ...template, layoutConfig },
                    student,
                    exam,
                    seatNumber,
                    center,
                    examDate,
                    examTime,
                    venue,
                });

                // Save admit card
                const admitCard = await prisma.admitCard.create({
                    data: {
                        studentId: student.userId,
                        examId: parseInt(examId),
                        schoolId,
                        seatNumber,
                        center: center || null,
                        layoutConfig: {
                            ...layoutConfig,
                            examDate,
                            examTime,
                            venue,
                        },
                        issueDate: new Date(),
                    },
                });

                results.admitCards.push({
                    id: admitCard.id,
                    studentName: student.name,
                    rollNumber: student.rollNumber,
                    seatNumber,
                    fileUrl: pdfUrl,
                });

                results.successCount++;
                currentSeatNumber++;

                console.log(`✅ Generated admit card for ${student.name} (${currentSeatNumber - 1}/${students.length})`);

            } catch (error) {
                console.error(`❌ Failed for ${student.name}:`, error);
                results.errors.push({
                    studentId: student.userId,
                    studentName: student.name,
                    error: error.message,
                });
                results.failedCount++;
                currentSeatNumber++;
            }
        }

        console.log(`✅ Bulk generation complete: ${results.successCount} success, ${results.failedCount} failed`);

        // 6. Create ZIP file URL (you can implement actual ZIP creation or just return individual URLs)
        // For now, returning the results
        return NextResponse.json({
            ...results,
            totalCount: students.length,
            message: `Successfully generated ${results.successCount} admit cards`,
        }, { status: 201 });

    } catch (error) {
        console.error('❌ Bulk generation error:', error);
        return NextResponse.json(
            { 
                error: 'Failed to generate admit cards', 
                message: error.message,
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
            },
            { status: 500 }
        );
    }
}