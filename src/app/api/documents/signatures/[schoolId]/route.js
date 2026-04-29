import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { serializeSignatureAsset } from '@/lib/document-signature-library';

function parseOptionalInt(value) {
  if (value == null || value === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeSignaturePayload(body = {}) {
  return {
    name: String(body.name || '').trim(),
    designation: body.designation ? String(body.designation).trim() : null,
    imageUrl: String(body.imageUrl || '').trim(),
    placeholderKey: String(body.placeholderKey || 'principalSignature').trim(),
    teacherUserId: body.teacherUserId || null,
    classId: body.classId == null || body.classId === '' ? null : Number.parseInt(body.classId, 10),
    sectionId: body.sectionId == null || body.sectionId === '' ? null : Number.parseInt(body.sectionId, 10),
    tags: Array.isArray(body.tags) ?
    body.tags.map((tag) => String(tag).trim()).filter(Boolean) :
    String(body.tags || '').
    split(',').
    map((tag) => tag.trim()).
    filter(Boolean),
    isDefault: !!body.isDefault,
    isActive: body.isActive !== false
  };
}export const GET = withSchoolAccess(async function GET(request, props) {
  const params = await props.params;
  const { schoolId } = params;
  try {
    if (!schoolId) return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const placeholderKey = searchParams.get('placeholderKey')?.trim() || undefined;
    const teacherUserId = searchParams.get('teacherUserId')?.trim() || undefined;
    const classId = parseOptionalInt(searchParams.get('classId'));
    const sectionId = parseOptionalInt(searchParams.get('sectionId'));
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const signatures = await prisma.signature.findMany({
      where: {
        schoolId,
        ...(activeOnly ? { isActive: true } : {}),
        ...(placeholderKey ? { placeholderKey } : {}),
        ...(teacherUserId ? { teacherUserId } : {}),
        ...(classId !== undefined ? { classId } : {}),
        ...(sectionId !== undefined ? { sectionId } : {}),
        ...(search ? {
          OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { designation: { contains: search, mode: 'insensitive' } },
          { teacher: { name: { contains: search, mode: 'insensitive' } } },
          { class: { className: { contains: search, mode: 'insensitive' } } },
          { section: { name: { contains: search, mode: 'insensitive' } } },
          { tags: { hasSome: search.split(/\s+/).filter(Boolean) } }]

        } : {})
      },
      include: {
        teacher: {
          select: {
            userId: true,
            name: true,
            employeeId: true
          }
        },
        class: {
          select: {
            id: true,
            className: true
          }
        },
        section: {
          select: {
            id: true,
            name: true,
            classId: true
          }
        }
      },
      orderBy: [
      { isDefault: 'desc' },
      { updatedAt: 'desc' }]

    });
    return NextResponse.json(signatures.map(serializeSignatureAsset));
  } catch (error) {
    console.error('[SIGNATURE_API_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = withSchoolAccess(async function POST(request, props) {
  const params = await props.params;
  const { schoolId } = params;
  const body = await request.json();
  try {
    if (!schoolId) return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    const payload = normalizeSignaturePayload(body);
    if (!payload.name || !payload.imageUrl) return NextResponse.json({ error: 'Name and imageUrl required' }, { status: 400 });

    const signature = await prisma.$transaction(async (tx) => {
      if (payload.isDefault) {
        await tx.signature.updateMany({
          where: {
            schoolId,
            placeholderKey: payload.placeholderKey
          },
          data: { isDefault: false }
        });
      }

      return tx.signature.create({
        data: {
          schoolId,
          ...payload
        },
        include: {
          teacher: {
            select: {
              userId: true,
              name: true,
              employeeId: true
            }
          },
          class: {
            select: {
              id: true,
              className: true
            }
          },
          section: {
            select: {
              id: true,
              name: true,
              classId: true
            }
          }
        }
      });
    });
    return NextResponse.json(serializeSignatureAsset(signature), { status: 201 });
  } catch (error) {
    console.error('[SIGNATURE_API_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});