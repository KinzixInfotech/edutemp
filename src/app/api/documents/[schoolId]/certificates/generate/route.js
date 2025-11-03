import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generatePDF } from '@/lib/pdf-generator'; // You'll need to create this utility

export async function POST(request, { params }) {
    try {
        const { schoolId } = params;
        const body = await request.json();

        const {
            studentId,
            templateId,
            certificateType,
            issueDate,
            issuedById,
            ...customFields
        } = body;

        // Fetch student details
        const student = await prisma.student.findUnique({
            where: { userId: studentId },
            include: {
                class: true,
                section: true,
                school: true,
            },
        });

        if (!student) {
            return NextResponse.json(
                { error: 'Student not found' },
                { status: 404 }
            );
        }

        // Fetch template
        const template = await prisma.certificateTemplate.findFirst({
            where: {
                id: templateId,
                schoolId,
                type: certificateType,
            },
        });

        if (!template) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        // Generate unique certificate number
        const certificateNumber = `CERT-${schoolId.slice(0, 4).toUpperCase()}-${Date.now()}`;

        // Generate PDF using template and data
        const pdfUrl = await generatePDF({
            template,
            student,
            certificateNumber,
            issueDate,
            customFields,
        });

        // Save certificate record
        const certificate = await prisma.certificateGenerated.create({
            data: {
                certificateNumber,
                templateId,
                studentId,
                schoolId,
                issuedById,
                issueDate: new Date(issueDate),
                customFields,
                fileUrl: pdfUrl,
                status: 'issued',
            },
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
                        rollNumber: true,
                    },
                },
                template: {
                    select: {
                        name: true,
                        type: true,
                    },
                },
                issuedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json(certificate, { status: 201 });
    } catch (error) {
        console.error('Error generating certificate:', error);
        return NextResponse.json(
            { error: 'Failed to generate certificate' },
            { status: 500 }
        );
    }
}