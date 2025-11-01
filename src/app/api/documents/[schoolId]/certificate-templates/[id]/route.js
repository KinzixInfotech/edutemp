import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
    try {
        const { schoolId, id } = params;

        const template = await prisma.documentTemplate.findFirst({
            where: {
                id,
                schoolId,
                templateType: 'certificate',
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
            type: template.subType,
            isDefault: template.isDefault,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
            createdBy: template.createdBy,
            layoutConfig: template.layoutConfig,
        });
    } catch (error) {
        console.error('Error fetching certificate template:', error);
        return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const { schoolId, id } = params;
        const body = await request.json();

        const { name, description, type, layoutConfig, isDefault } = body;

        if (isDefault) {
            await prisma.documentTemplate.updateMany({
                where: {
                    schoolId,
                    templateType: 'certificate',
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
            type: template.subType,
            isDefault: template.isDefault,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
            createdBy: template.createdBy,
            layoutConfig: template.layoutConfig,
        });
    } catch (error) {
        console.error('Error updating certificate template:', error);
        return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { schoolId, id } = params;

        const template = await prisma.documentTemplate.findFirst({
            where: { id, schoolId, templateType: 'certificate' },
        });

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        const usageCount = await prisma.certificateGenerated.count({
            where: { templateId: id },
        });

        if (usageCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete template. It is being used by ${usageCount} certificate(s).` },
                { status: 400 }
            );
        }

        await prisma.documentTemplate.update({
            where: { id },
            data: { isActive: false },
        });

        return NextResponse.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting certificate template:', error);
        return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }
}