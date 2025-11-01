import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Fetch single certificate template
export async function GET(request, { params }) {
    try {
        const { schoolId, id } = params;

        const template = await prisma.certificateTemplate.findFirst({
            where: {
                id,
                schoolId,
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
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(template);
    } catch (error) {
        console.error('Error fetching certificate template:', error);
        return NextResponse.json(
            { error: 'Failed to fetch template' },
            { status: 500 }
        );
    }
}

// PUT - Update certificate template
export async function PUT(request, { params }) {
    try {
        const { schoolId, id } = params;
        const body = await request.json();

        const {
            name,
            description,
            type,
            layoutConfig,
            isDefault,
        } = body;

        // If setting as default, unset other defaults of same type
        if (isDefault) {
            await prisma.certificateTemplate.updateMany({
                where: {
                    schoolId,
                    type,
                    isDefault: true,
                    id: { not: id },
                },
                data: { isDefault: false },
            });
        }

        const template = await prisma.certificateTemplate.update({
            where: { id },
            data: {
                name,
                description,
                type,
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

        return NextResponse.json(template);
    } catch (error) {
        console.error('Error updating certificate template:', error);
        return NextResponse.json(
            { error: 'Failed to update template' },
            { status: 500 }
        );
    }
}

// DELETE - Delete certificate template
export async function DELETE(request, { params }) {
    try {
        const { schoolId, id } = params;

        // Check if template exists and belongs to school
        const template = await prisma.certificateTemplate.findFirst({
            where: {
                id,
                schoolId,
            },
        });

        if (!template) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        // Check if template is being used
        const usageCount = await prisma.certificateGenerated.count({
            where: { templateId: id },
        });

        if (usageCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete template. It is being used by ${usageCount} certificate(s).` },
                { status: 400 }
            );
        }

        await prisma.certificateTemplate.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting certificate template:', error);
        return NextResponse.json(
            { error: 'Failed to delete template' },
            { status: 500 }
        );
    }
}