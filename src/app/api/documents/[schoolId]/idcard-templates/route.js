import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;

        const templates = await prisma.documentTemplate.findMany({
            where: {
                schoolId,
                templateType: 'idcard',
                isActive: true,
            },
            orderBy: { createdAt: 'desc' },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        const mappedTemplates = templates.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            cardType: t.subType,
            orientation: t.layoutConfig?.orientation || 'portrait',
            isDefault: t.isDefault,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            createdBy: t.createdBy,
            layoutConfig: t.layoutConfig,
        }));

        return NextResponse.json(mappedTemplates);
    } catch (error) {
        console.error('Error fetching ID card templates:', error);
        return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }
}

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await request.json();

        const { name, description, type, layoutConfig, createdById, isDefault } = body;

        if (isDefault) {
            await prisma.documentTemplate.updateMany({
                where: {
                    schoolId,
                    templateType: 'idcard',
                    subType: type,
                    isDefault: true,
                },
                data: { isDefault: false },
            });
        }

        const template = await prisma.documentTemplate.create({
            data: {
                name,
                description,
                templateType: 'idcard',
                subType: type,
                layoutConfig,
                schoolId,
                createdById,
                isDefault: isDefault || false,
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json({
            id: template.id,
            name: template.name,
            description: template.description,
            cardType: template.subType,
            orientation: template.layoutConfig?.orientation || 'portrait',
            isDefault: template.isDefault,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
            createdBy: template.createdBy,
            layoutConfig: template.layoutConfig,
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating ID card template:', error);
        return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }
}