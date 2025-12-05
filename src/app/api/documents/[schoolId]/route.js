// app/api/documents/[schoolId]/route.js
import { NextResponse } from 'next/server';
// import { PrismaClient } from '@prisma/client';
import { generateCertificateNumber } from '@/lib/utils'; // Assume a utility for generating unique numbers'
import prisma from "@/lib/prisma";
import { paginate, getPagination, apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

export async function GET(request, props) {
  const params = await props.params;
  const { searchParams } = new URL(request.url);
  const schoolId = params.schoolId;
  const type = searchParams.get('type');

  try {
    if (!schoolId) {
      return errorResponse('School ID is required', 400);
    }

    const { page, limit, skip } = getPagination(request);
    const cacheKey = generateKey('documents:templates', { schoolId, type, page, limit });

    const result = await remember(cacheKey, async () => {
      const where = { schoolId };
      if (type) {
        where.type = type;
      }

      return await paginate(prisma.certificateTemplate, {
        where,
        include: { createdBy: { select: { name: true } } },
      }, page, limit);
    }, 300);

    // Return data array for backward compatibility
    return apiResponse(result.data);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return errorResponse('Internal server error');
  }
}

export async function POST(request, props) {
  const params = await props.params;
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

    // Invalidate templates cache
    await invalidatePattern(`documents:templates:${schoolId}*`);

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



