// app/api/admitcards/[schoolId]/route.js
import { NextResponse } from 'next/server';

import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';


export async function GET(request, props) {
  const params = await props.params;
  const schoolId = params.schoolId;
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get('examId');

  try {
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    const where = { schoolId };
    if (examId) where.examId = examId;

    const admitCards = await prisma.admitCard.findMany({
      where,
      include: {
        student: { include: { user: true, class: true } },
        exam: true,
        school: true,
      },
    });

    return NextResponse.json(admitCards);
  } catch (error) {
    console.error('Error fetching admit cards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, props) {
  const params = await props.params;
  const schoolId = params.schoolId;
  const body = await request.json(); // { examId, studentIds: [], center: '' }

  try {
    if (!schoolId || !body.examId || !body.studentIds?.length) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: body.examId },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const admitCards = [];
    for (const studentId of body.studentIds) {
      const student = await prisma.student.findUnique({
        where: { userId: studentId },
      });

      if (!student) continue;

      // Auto-assign seat number (simple sequential)
      const seatNumber = `S${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Generate QR
      const qrData = { studentId, examId: body.examId, seatNumber };
      const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData));

      // Generate PDF (simplified)
      const doc = new jsPDF();
      doc.text(`Admit Card for ${exam.title}`, 10, 10);
      doc.text(`Student: ${student.name}`, 10, 20);
      doc.text(`Seat: ${seatNumber}`, 10, 30);
      doc.text(`Center: ${body.center || 'TBD'}`, 10, 40);
      doc.addImage(qrCodeUrl.split(',')[1], 'PNG', 150, 10, 50, 50);

      const pdfBuffer = doc.output('arraybuffer');
      const fileUrl = `data:application/pdf;base64,${Buffer.from(pdfBuffer).toString('base64')}`;

      const admitCard = await prisma.admitCard.create({
        data: {
          studentId,
          examId: body.examId,
          schoolId,
          seatNumber,
          center: body.center,
          layoutConfig: { /* default layout */ },
          fileUrl,
        },
        include: { student: true, exam: true },
      });

      admitCards.push(admitCard);
    }

    return NextResponse.json(admitCards, { status: 201 });
  } catch (error) {
    console.error('Error generating admit cards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}