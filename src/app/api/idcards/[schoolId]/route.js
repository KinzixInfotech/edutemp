// app/api/idcards/[schoolId]/route.js
import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';


export async function POST(request, props) {
  const params = await props.params;
  const schoolId = params.schoolId;
  const body = await request.json(); // { studentId, academicYearId? }

  try {
    if (!schoolId || !body.studentId) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { userId: body.studentId },
      include: { user: true, class: true, school: true, academicYear: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const qrData = { studentId: body.studentId, schoolId };
    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData));

    // Generate PDF
    const doc = new jsPDF();
    doc.text(`ID Card - ${student.school.name}`, 10, 10);
    doc.text(`Name: ${student.name}`, 10, 20);
    doc.text(`Class: ${student.class.className}`, 10, 30);
    doc.text(`Roll: ${student.rollNumber}`, 10, 40);
    doc.addImage(qrCodeUrl.split(',')[1], 'PNG', 150, 10, 50, 50);
    // Add photo if available: assume student.user.profilePicture

    const pdfBuffer = doc.output('arraybuffer');
    const fileUrl = `data:application/pdf;base64,${Buffer.from(pdfBuffer).toString('base64')}`;

    const idCard = await prisma.digitalIdCard.create({
      data: {
        studentId: body.studentId,
        schoolId,
        academicYearId: body.academicYearId,
        qrCodeUrl,
        layoutConfig: { /* default */ },
      },
      include: { student: true, school: true },
    });

    return NextResponse.json({ ...idCard, fileUrl });
  } catch (error) {
    console.error('Error generating ID card:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}