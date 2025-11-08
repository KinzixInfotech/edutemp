import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;

        const templates = await prisma.documentTemplate.findMany({
            where: {
                schoolId,
                templateType: 'certificate',
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

        // Map to match expected format
        const mappedTemplates = templates.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            type: t.subType,
            isDefault: t.isDefault,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            createdBy: t.createdBy,
            layoutConfig: t.layoutConfig,
        }));

        return NextResponse.json(mappedTemplates);
    } catch (error) {
        console.error('Error fetching certificate templates:', error);
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
                    templateType: 'certificate',
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
                templateType: 'certificate',
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
            type: template.subType,
            isDefault: template.isDefault,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
            createdBy: template.createdBy,
            layoutConfig: template.layoutConfig,
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating certificate template:', error);
        return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }
}