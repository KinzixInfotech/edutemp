import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Fetch all ID card templates
export async function GET(request, { params }) {
    try {
        const { schoolId } = params;

        // Note: You'll need to create IdCardTemplate model in Prisma
        // For now, using a generic structure
        const templates = await prisma.$queryRaw`
            SELECT * FROM "IdCardTemplate" 
            WHERE "schoolId" = ${schoolId}::uuid 
            ORDER BY "createdAt" DESC
        `;

        return NextResponse.json(templates || []);
    } catch (error) {
        console.error('Error fetching ID card templates:', error);
        return NextResponse.json(
            { error: 'Failed to fetch templates' },
            { status: 500 }
        );
    }
}

// POST - Create new ID card template
export async function POST(request, { params }) {
    try {
        const { schoolId } = params;
        const body = await request.json();

        const {
            name,
            description,
            cardType,
            orientation,
            layoutConfig,
            createdById,
            isDefault,
        } = body;

        // Note: You'll need to add IdCardTemplate model to your Prisma schema
        const template = await prisma.$queryRaw`
            INSERT INTO "IdCardTemplate" (
                id, name, description, "cardType", orientation, 
                "layoutConfig", "schoolId", "createdById", 
                "isDefault", "createdAt", "updatedAt"
            ) VALUES (
                gen_random_uuid(), ${name}, ${description}, ${cardType || 'student'}, 
                ${orientation || 'portrait'}, ${JSON.stringify(layoutConfig)}, 
                ${schoolId}::uuid, ${createdById}::uuid, 
                ${isDefault || false}, NOW(), NOW()
            )
            RETURNING *
        `;

        return NextResponse.json(template[0], { status: 201 });
    } catch (error) {
        console.error('Error creating ID card template:', error);
        return NextResponse.json(
            { error: 'Failed to create template' },
            { status: 500 }
        );
    }
}