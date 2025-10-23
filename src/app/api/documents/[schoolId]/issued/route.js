// app/api/documents/[schoolId]/issued/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const schoolId = params.schoolId;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const studentId = searchParams.get('studentId');

  try {
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    const where = { schoolId };
    if (status) where.status = status;
    if (studentId) where.studentId = studentId;

    const certificates = await prisma.certificateGenerated.findMany({
      where,
      include: {
        student: { include: { user: true, class: true } },
        template: true,
        issuedBy: { select: { name: true } },
      },
      orderBy: { issueDate: 'desc' },
    });

    return NextResponse.json(certificates);
  } catch (error) {
    console.error('Error fetching issued certificates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}