import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generatePDF } from '@/lib/pdf-generator';
import { toBase64 } from '@/lib/utils';
import { sendNotification } from '@/lib/notifications/notificationHelper';

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await request.json();

        const {
            studentId,
            templateId,
            certificateType,
            issueDate,
            issuedById,
            showToParent = false,
            ...customFields
        } = body;

        // console.log('📝 Generate Request:', { studentId, templateId, certificateType });

        // 1. Fetch student
        const student = await prisma.student.findUnique({
            where: { userId: studentId },
            include: {
                class: true,
                section: true,
                school: true,
            },
        });

        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        // 2. Fetch template
        const template = await prisma.documentTemplate.findFirst({
            where: {
                id: templateId,
                schoolId,
                templateType: 'certificate',
                subType: certificateType,
                isActive: true,
            },
        });

        if (!template) {
            console.error('❌ Template not found');
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        // console.log('✅ Template found:', template.name);

        // 3. Generate certificate number
        const certificateNumber = `CERT-${schoolId.slice(0, 4).toUpperCase()}-${Date.now()}`;

        // 4. Convert logo to base64 if needed
        let layoutConfig = { ...template.layoutConfig };
        console.log(layoutConfig);
        // if (layoutConfig?.logoUrl && !layoutConfig.logoUrl.startsWith('data:')) {
        //     try {
        //         const response = await fetch(layoutConfig.logoUrl);
        //         if (response.ok) {
        //             const buffer = await response.arrayBuffer();
        //             const base64 = Buffer.from(buffer).toString("base64");
        //             const mime = response.headers.get('content-type') || 'image/png';
        //             layoutConfig.logoUrl = `data:${mime};base64,${base64}`;
        //         }
        //     } catch (error) {
        //         // console.warn('⚠️ Failed to convert logo:', error.message);
        //     }
        // }
        if (layoutConfig) {
            if (layoutConfig.logoUrl) layoutConfig.logoUrl = await toBase64(layoutConfig.logoUrl);
            if (layoutConfig.backgroundImage) layoutConfig.backgroundImage = await toBase64(layoutConfig.backgroundImage);
            if (layoutConfig.signatureUrl) layoutConfig.signatureUrl = await toBase64(layoutConfig.signatureUrl);
            if (layoutConfig.stampUrl) layoutConfig.stampUrl = await toBase64(layoutConfig.stampUrl);
        }
        // 5. Generate PDF
        // console.log('📄 Generating PDF...');
        const pdfUrl = await generatePDF({
            template: { ...template, layoutConfig },
            student,
            certificateNumber,
            issueDate,
            customFields,
        });

        // console.log('✅ PDF generated:', pdfUrl);

        // 6. Save certificate (SIMPLIFIED - only required fields)
        const certificate = await prisma.certificateGenerated.create({
            data: {
                certificateNumber,
                templateId,
                studentId,
                schoolId,
                issuedById: issuedById || null,
                issueDate: new Date(issueDate),
                customFields: customFields,
                fileUrl: pdfUrl,
                status: 'issued',
                showToParent,
                sharedAt: showToParent ? new Date() : null,
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
                        templateType: true,
                        subType: true,
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

        // console.log('✅ Certificate saved:', certificate.id);

        // Send notification to parent if showToParent enabled
        if (showToParent) {
            try {
                const parentRelation = await prisma.studentParentLink.findFirst({
                    where: { studentId },
                    select: { parent: { select: { userId: true } } }
                });
                if (parentRelation) {
                    await sendNotification({
                        schoolId,
                        title: "🎖️ Certificate Available",
                        message: `${template.name || 'Certificate'} for ${student.name} is now available`,
                        type: 'GENERAL',
                        priority: 'NORMAL',
                        icon: '🎖️',
                        targetOptions: { userIds: [parentRelation.parent.userId] },
                        senderId: issuedById || 'system',
                        sendPush: true,
                        actionUrl: '/documents',
                        metadata: { certificateId: certificate.id, type: 'certificate' }
                    });
                }
            } catch (notifErr) {
                console.warn('⚠️ Notification failed:', notifErr.message);
            }
        }

        return NextResponse.json(certificate, { status: 201 });

    } catch (error) {
        console.error('❌ Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate certificate',
                message: error.message,
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
            },
            { status: 500 }
        );
    }
}