import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email'; // You'll need to create this utility

export async function POST(request, { params }) {
    try {
        const { schoolId, id } = params;

        const certificate = await prisma.certificateGenerated.findFirst({
            where: {
                id,
                schoolId,
            },
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                template: {
                    select: {
                        name: true,
                        type: true,
                    },
                },
            },
        });

        if (!certificate) {
            return NextResponse.json(
                { error: 'Certificate not found' },
                { status: 404 }
            );
        }

        // Send email with certificate attachment
        await sendEmail({
            to: certificate.student.email,
            subject: `Your ${certificate.template.name}`,
            html: `
                <h2>Dear ${certificate.student.name},</h2>
                <p>Please find your ${certificate.template.name} attached to this email.</p>
                <p>Certificate Number: ${certificate.certificateNumber}</p>
                <p>Issue Date: ${new Date(certificate.issueDate).toLocaleDateString()}</p>
                <br>
                <p>Best regards,<br>School Administration</p>
            `,
            attachments: [
                {
                    filename: `${certificate.certificateNumber}.pdf`,
                    path: certificate.fileUrl,
                },
            ],
        });

        return NextResponse.json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        return NextResponse.json(
            { error: 'Failed to send email' },
            { status: 500 }
        );
    }
}