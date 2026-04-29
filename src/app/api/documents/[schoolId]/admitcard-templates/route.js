import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey, invalidatePattern } from '@/lib/cache';
import { paginate, getPagination } from '@/lib/api-utils';

export const GET = withSchoolAccess(async function GET(request, props) {
  const params = await props.params;
  try {
    const { schoolId } = params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const fetchAll = searchParams.get('all') === 'true';
    const { page, limit } = getPagination(request);

    const cacheKey = generateKey('admitcard-templates', { schoolId, type, page, limit, fetchAll });
    const templates = await remember(cacheKey, async () => {
      const queryArgs = {
        where: {
          schoolId,
          templateType: 'admitcard',
          isActive: true,
          ...(type ? { subType: type } : {})
        },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      };

      if (fetchAll) {
        return prisma.documentTemplate.findMany(queryArgs);
      }

      const result = await paginate(prisma.documentTemplate, queryArgs, page, limit);
      return result.data;
    }, 300);

    const mappedTemplates = templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      examType: t.subType,
      layoutType: t.layoutConfig?.layoutType || 'standard',
      isDefault: t.isDefault,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      createdBy: t.createdBy,
      layoutConfig: t.layoutConfig
    }));

    return NextResponse.json(mappedTemplates);
  } catch (error) {
    console.error('Error fetching admit card templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
});

export const POST = withSchoolAccess(async function POST(request, props) {
  const params = await props.params;
  try {
    const { schoolId } = params;
    const body = await request.json();

    const { name, description, type, layoutConfig, createdById, isDefault } = body;

    if (isDefault) {
      await prisma.documentTemplate.updateMany({
        where: {
          schoolId,
          templateType: 'admitcard',
          subType: type,
          isDefault: true
        },
        data: { isDefault: false }
      });
    }

    const template = await prisma.documentTemplate.create({
      data: {
        name,
        description,
        templateType: 'admitcard',
        subType: type,
        layoutConfig,
        schoolId,
        createdById,
        isDefault: isDefault || false
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    await invalidatePattern(`admitcard-templates:*schoolId:${schoolId}*`);

    return NextResponse.json({
      id: template.id,
      name: template.name,
      description: template.description,
      examType: template.subType,
      layoutType: template.layoutConfig?.layoutType || 'standard',
      isDefault: template.isDefault,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      createdBy: template.createdBy,
      layoutConfig: template.layoutConfig
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating admit card template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
});