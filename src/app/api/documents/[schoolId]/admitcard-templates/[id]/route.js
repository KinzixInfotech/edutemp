import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Fetch single admit card template
export async function GET(request, { params }) {
    try {
        const { schoolId, id } = params;

        const template = await prisma.$queryRaw`
            SELECT * FROM "AdmitCardTemplate" 
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
        console.error('Error fetching admit card template:', error);
        return NextResponse.json(
            { error: 'Failed to fetch template' },
            { status: 500 }
        );
    }
}

// PUT - Update admit card template
export async function PUT(request, { params }) {
    try {
        const { schoolId, id } = params;
        const body = await request.json();

        const {
            name,
            description,
            examType,
            layoutType,
            layoutConfig,
            isDefault,
        } = body;

        const template = await prisma.$queryRaw`
            UPDATE "AdmitCardTemplate" 
            SET 
                name = ${name},
                description = ${description},
                "examType" = ${examType},
                "layoutType" = ${layoutType},
                "layoutConfig" = ${JSON.stringify(layoutConfig)},
                "isDefault" = ${isDefault},
                "updatedAt" = NOW()
            WHERE id = ${id}::uuid AND "schoolId" = ${schoolId}::uuid
            RETURNING *
        `;

        return NextResponse.json(template[0]);
    } catch (error) {
        console.error('Error updating admit card template:', error);
        return NextResponse.json(
            { error: 'Failed to update template' },
            { status: 500 }
        );
    }
}

// DELETE - Delete admit card template
export async function DELETE(request, { params }) {
    try {
        const { schoolId, id } = params;

        // Check if template is being used
        const usageCount = await prisma.admitCard.count({
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
                { error: `Cannot delete template. It is being used by ${usageCount} admit card(s).` },
                { status: 400 }
            );
        }

        await prisma.$queryRaw`
            DELETE FROM "AdmitCardTemplate" 
            WHERE id = ${id}::uuid AND "schoolId" = ${schoolId}::uuid
        `;

        return NextResponse.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting admit card template:', error);
        return NextResponse.json(
            { error: 'Failed to delete template' },
            { status: 500 }
        );
    }
}