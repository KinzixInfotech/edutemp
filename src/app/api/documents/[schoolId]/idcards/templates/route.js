import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const GET = withSchoolAccess(async function GET(request, props) {
  const params = await props.params;
  try {
    const { schoolId } = params;
    const templates = await prisma.documentTemplate.findMany({
      where: {
        schoolId,
        templateType: 'idcard',
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching ID card templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
});