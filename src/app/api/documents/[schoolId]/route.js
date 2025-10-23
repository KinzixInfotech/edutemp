// app/api/documents/[schoolId]/route.js
import { NextResponse } from 'next/server';
// import { PrismaClient } from '@prisma/client';
import { generateCertificateNumber } from '@/lib/utils'; // Assume a utility for generating unique numbers'
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  const { searchParams } = new URL(request.url);
  const schoolId = params.schoolId;
  const type = searchParams.get('type');

  try {
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    const where = { schoolId };
    if (type) {
      where.type = type;
    }

    const templates = await prisma.certificateTemplate.findMany({
      where,
      include: { createdBy: { select: { name: true } } },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const schoolId = params.schoolId;
  const body = await request.json();

  try {
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    const template = await prisma.certificateTemplate.create({
      data: {
        ...body,
        schoolId,
        createdById: body.createdById || null,
      },
      include: { school: { select: { name: true } } },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



