import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Fetch single ID card template
export async function GET(request, { params }) {
    try {
        const { schoolId, id } = params;

        const template = await prisma.$queryRaw`
            SELECT * FROM "IdCardTemplate" 
            WHERE id = ${id}::uuid AND "schoolId" = ${schoolId}::uuid
        `;

        if (!template || template.length === 0) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(template[0]);
    } catch (error) {
        console.error('Error fetching ID card template:', error);
        return NextResponse.json(
            { error: 'Failed to fetch template' },
            { status: 500 }
        );
    }
}

// PUT - Update ID card template
export async function PUT(request, { params }) {
    try {
        const { schoolId, id } = params;
        const body = await request.json();

        const {
            name,
            description,
            cardType,
            orientation,
            layoutConfig,
            isDefault,
        } = body;

        const template = await prisma.$queryRaw`
            UPDATE "IdCardTemplate" 
            SET 
                name = ${name},
                description = ${description},
                "cardType" = ${cardType},
                orientation = ${orientation},
                "layoutConfig" = ${JSON.stringify(layoutConfig)},
                "isDefault" = ${isDefault},
                "updatedAt" = NOW()
            WHERE id = ${id}::uuid AND "schoolId" = ${schoolId}::uuid
            RETURNING *
        `;

        return NextResponse.json(template[0]);
    } catch (error) {
        console.error('Error updating ID card template:', error);
        return NextResponse.json(
            { error: 'Failed to update template' },
            { status: 500 }
        );
    }
}

// DELETE - Delete ID card template
export async function DELETE(request, { params }) {
    try {
        const { schoolId, id } = params;

        // Check if template is being used
        const usageCount = await prisma.digitalIdCard.count({
            where: {
                schoolId,
                layoutConfig: {
                    path: ['templateId'],
                    equals: id
                }
            },
        });

        if (usageCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete template. It is being used by ${usageCount} ID card(s).` },
                { status: 400 }
            );
        }

        await prisma.$queryRaw`
            DELETE FROM "IdCardTemplate" 
            WHERE id = ${id}::uuid AND "schoolId" = ${schoolId}::uuid
        `;

        return NextResponse.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting ID card template:', error);
        return NextResponse.json(
            { error: 'Failed to delete template' },
            { status: 500 }
        );
    }
}