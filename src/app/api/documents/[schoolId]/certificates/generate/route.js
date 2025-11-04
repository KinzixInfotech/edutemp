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
        const template = await prisma.documentTemplate.findFirst({
            where: {
                id: templateId,
                schoolId,
                subType: certificateType,
                isActive: true,
            },
        });
        console.log(template);

        if (!template) {
            console.error('Template not found:', { templateId, schoolId, certificateType });
            return NextResponse.json({ error: 'Template not found or inactive' }, { status: 404 });
        }

        // Generate unique certificate number
        const certificateNumber = `CERT-${schoolId.slice(0, 4).toUpperCase()}-${Date.now()}`;
        // console.log(template, student, certificateNumber, customFields);
        // Fix: Convert logoUrl to base64 before generating PDF
        if (template?.layoutConfig?.logoUrl) {
            try {
                const response = await fetch(template.layoutConfig.logoUrl);
                const buffer = await response.arrayBuffer();
                const base64Image = Buffer.from(buffer).toString("base64");
                template.layoutConfig.logoUrl = `data:image/png;base64,${base64Image}`;
            } catch (error) {
                console.error("Failed to fetch and convert logo:", error);
            }
        }

        // Generate PDF using template and data
        const pdfUrl = await generatePDF({
            template,
            student,
            certificateNumber,
            issueDate,
            customFields,
        });

        // Generate PDF using template and data
        // const pdfUrl = await generatePDF({
        //     template,
        //     student,
        //     certificateNumber,
        //     issueDate,
        //     customFields,
        // });

        // Save certificate record
        const certificate = await prisma.certificateGenerated.create({
            data: {
                certificateNumber,
                templateId, // This should reference the CertificateTemplate if you have one
                studentId,
                schoolId,
                issuedById: issuedById || null,
                issueDate: new Date(issueDate),
                customFields: customFields || {},
                fileUrl:template.layoutConfig.logoUrl,
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