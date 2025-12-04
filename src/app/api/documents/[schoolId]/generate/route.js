import { NextResponse } from 'next/server';
import { generatePDF } from '@/lib/pdf-generator';
import { generateCertificateNumber } from '@/lib/utils';
import prisma from '@/lib/prisma';

export async function POST(request, props) {
  const params = await props.params;
  const schoolId = params.schoolId;
  const body = await request.json();

  try {
    if (!schoolId || !body.templateId || !body.studentId) {
      return NextResponse.json({ error: 'School ID, Template ID, and Student ID are required' }, { status: 400 });
    }

    const template = await prisma.documentTemplate.findUnique({
      where: { id: body.templateId },
      include: { school: true },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const student = await prisma.student.findUnique({
      where: { userId: body.studentId },
      include: { user: true, class: true, section: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const certificateNumber = generateCertificateNumber();
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify/certificate/${certificateNumber}`;

    // Generate PDF
    const pdfDataUrl = await generatePDF({
      template,
      student: {
        ...student,
        name: student.user.name, // Flatten user data
        photoUrl: student.user.profilePicture,
        studentId: student.admissionNo || student.userId, // Use admission no as student ID if available
      },
      certificateNumber,
      issueDate: new Date(),
      customFields: body.customFields,
      verificationUrl
    });

    // In a real app, upload pdfDataUrl to S3/Blob storage and get a public URL
    // For now, we'll save the data URL (warning: large size) or just a placeholder if it's too big for DB
    // Ideally, we should upload it.
    // Let's assume we return the data URL to the client to download/preview, and save a reference or the file itself if supported.

    // For this implementation, we'll save the record. 
    // Note: Saving base64 PDF to DB is bad practice. 
    // We'll assume the client handles the upload or we just return it for now.
    // But the existing code saved `fileUrl`.

    const fileUrl = pdfDataUrl; // This is a Data URI

    const certificate = await prisma.certificateGenerated.create({
      data: {
        certificateNumber,
        templateId: body.templateId,
        studentId: body.studentId,
        schoolId,
        issuedById: body.issuedById || null,
        customFields: body.customFields || {},
        fileUrl: "placeholder_url_pending_upload", // Don't save base64 to DB
        status: body.status || 'issued',
      },
      include: {
        student: { include: { user: true } },
        template: true,
        school: true,
      },
    });

    // Return the PDF data so the client can download/view it
    return NextResponse.json({ ...certificate, pdfDataUrl });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}