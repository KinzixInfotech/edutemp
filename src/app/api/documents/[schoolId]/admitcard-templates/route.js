import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Fetch all admit card templates
export async function GET(request, { params }) {
    try {
        const { schoolId } = params;

        const templates = await prisma.$queryRaw`
            SELECT * FROM "AdmitCardTemplate" 
            WHERE "schoolId" = ${schoolId}::uuid 
            ORDER BY "createdAt" DESC
        `;

        return NextResponse.json(templates || []);
    } catch (error) {
        console.error('Error fetching admit card templates:', error);
        return NextResponse.json(
            { error: 'Failed to fetch templates' },
            { status: 500 }
        );
    }
}

// POST - Create new admit card template
export async function POST(request, { params }) {
    try {
        const { schoolId } = params;
        const body = await request.json();

        const {
            name,
            description,
            examType,
            layoutType,
            layoutConfig,
            createdById,
            isDefault,
        } = body;

        const template = await prisma.$queryRaw`
            INSERT INTO "AdmitCardTemplate" (
                id, name, description, "examType", "layoutType",
                "layoutConfig", "schoolId", "createdById", 
                "isDefault", "createdAt", "updatedAt"
            ) VALUES (
                gen_random_uuid(), ${name}, ${description}, ${examType || 'general'}, 
                ${layoutType || 'standard'}, ${JSON.stringify(layoutConfig)}, 
                ${schoolId}::uuid, ${createdById}::uuid, 
                ${isDefault || false}, NOW(), NOW()
            )
            RETURNING *
        `;

        return NextResponse.json(template[0], { status: 201 });
    } catch (error) {
        console.error('Error creating admit card template:', error);
        return NextResponse.json(
            { error: 'Failed to create template' },
            { status: 500 }
        );
    }
}