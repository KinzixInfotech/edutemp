import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, props) {
    const params = await props.params;
    try {
        const { schoolId, id } = params;

        const template = await prisma.documentTemplate.findFirst({
            where: {
                id,
                schoolId,
                templateType: 'idcard',
                isActive: true,
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

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

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
        });
    } catch (error) {
        console.error('Error fetching ID card template:', error);
        return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
    }
}

export async function PUT(request, props) {
    const params = await props.params;
    try {
        const { schoolId, id } = params;
        const body = await request.json();

        const { name, description, type, layoutConfig, isDefault } = body;

        if (isDefault) {
            await prisma.documentTemplate.updateMany({
                where: {
                    schoolId,
                    templateType: 'idcard',
                    subType: type,
                    isDefault: true,
                    id: { not: id },
                },
                data: { isDefault: false },
            });
        }

        const template = await prisma.documentTemplate.update({
            where: { id },
            data: {
                name,
                description,
                subType: type,
                layoutConfig,
                isDefault,
                updatedAt: new Date(),
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
        });
    } catch (error) {
        console.error('Error updating ID card template:', error);
        return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }
}

export async function DELETE(request, props) {
    const params = await props.params;
    try {
        const { schoolId, id } = params;

        const template = await prisma.documentTemplate.findFirst({
            where: { id, schoolId, templateType: 'idcard' },
        });

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        const usageCount = await prisma.digitalIdCard.count({
            where: {
                schoolId,
                layoutConfig: {
                    path: ['templateId'],
                    equals: id,
                },
            },
        });

        if (usageCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete template. It is being used by ${usageCount} ID card(s).` },
                { status: 400 }
            );
        }

        await prisma.documentTemplate.update({
            where: { id },
            data: { isActive: false },
        });

        return NextResponse.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting ID card template:', error);
        return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }
}