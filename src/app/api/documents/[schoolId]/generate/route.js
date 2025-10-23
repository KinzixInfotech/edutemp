import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { generateCertificateNumber } from '@/lib/utils';
import prisma from '@/lib/prisma';

export async function POST(request, { params }) {
  const schoolId = params.schoolId;
  const body = await request.json();

  try {
    if (!schoolId || !body.templateId || !body.studentId) {
      return NextResponse.json({ error: 'School ID, Template ID, and Student ID are required' }, { status: 400 });
    }

    const template = await prisma.certificateTemplate.findUnique({
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

    // Generate QR Code
    const qrData = { studentId: body.studentId, certificateNumber, schoolId };
    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData));

    // Prepare data for placeholder replacement
    const data = {
      '{{student.name}}': student.name || 'N/A',
      '{{student.dob}}': student.dob || 'N/A',
      '{{student.class}}': student.class?.className || 'N/A',
      '{{school.name}}': template.school.name || 'N/A',
      '{{date}}': new Date().toLocaleDateString(),
      '{{certificate_number}}': certificateNumber,
      '{{qr_code}}': qrCodeUrl,
      '{{photo}}': student.user.profilePicture || '', // Assume profilePicture is a URL
      // Add more placeholders as needed
    };

    // Add custom fields from request
    if (body.customFields) {
      Object.entries(body.customFields).forEach(([key, value]) => {
        data[`{{${key}}}`] = value;
      });
    }

    // Generate PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4', // 595x842 pts
    });

    // Render elements from layoutConfig
    if (template.layoutConfig?.elements?.length) {
      template.layoutConfig.elements.forEach((el) => {
        let text = el.text;
        // Replace placeholders
        Object.keys(data).forEach((key) => {
          text = text.replace(key, data[key] || '');
        });

        // Handle special cases (e.g., QR code, photo)
        if (el.text === '{{qr_code}}') {
          doc.addImage(data['{{qr_code}}'].split(',')[1], 'PNG', el.x / 1.33, el.y / 1.33, 50, 50); // Scale: 800x600 canvas to A4
        } else if (el.text === '{{photo}}' && data['{{photo}}']) {
          doc.addImage(data['{{photo}}'], 'JPEG', el.x / 1.33, el.y / 1.33, 50, 50); // Adjust size as needed
        } else {
          doc.setFontSize(el.fontSize || 16);
          doc.setTextColor(el.color || '#000000');
          doc.text(text, el.x / 1.33, el.y / 1.33); // Scale positions (800x600 canvas to ~595x842 A4)
        }
      });
    } else {
      // Fallback if no layoutConfig
      doc.text(`Certificate: ${template.name}`, 10, 10);
      doc.text(`Student: ${student.name}`, 10, 20);
      doc.text(`Number: ${certificateNumber}`, 10, 30);
      if (body.customFields) {
        Object.entries(body.customFields).forEach(([key, value], index) => {
          doc.text(`${key}: ${value}`, 10, 40 + index * 10);
        });
      }
      doc.addImage(qrCodeUrl.split(',')[1], 'PNG', 150, 10, 50, 50);
    }

    const pdfBuffer = doc.output('arraybuffer');
    // Assume upload to S3/Supabase; here, base64 for simplicity
    const fileUrl = `data:application/pdf;base64,${Buffer.from(pdfBuffer).toString('base64')}`;

    const certificate = await prisma.certificateGenerated.create({
      data: {
        certificateNumber,
        templateId: body.templateId,
        studentId: body.studentId,
        schoolId,
        issuedById: body.issuedById || null,
        customFields: body.customFields || {},
        fileUrl,
        status: body.status || 'issued',
      },
      include: {
        student: { include: { user: true } },
        template: true,
        school: true,
      },
    });

    return NextResponse.json({ ...certificate, pdfBuffer });
  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}