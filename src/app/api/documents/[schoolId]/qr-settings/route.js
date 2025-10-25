// app/api/documents/[schoolId]/qr-settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req, { params }) {
  const settings = await prisma.qrVerificationSettings.findUnique({
    where: { schoolId: params.schoolId },
  });
  return NextResponse.json(settings || {});
}

export async function POST(req, { params }) {
  const body = await req.json();
  const { userId, ...data } = body;

  const settings = await prisma.qrVerificationSettings.upsert({
    where: { schoolId: params.schoolId },
    update: { ...data, updatedAt: new Date() },
    create: { ...data, schoolId: params.schoolId },
  });

  return NextResponse.json(settings);
}