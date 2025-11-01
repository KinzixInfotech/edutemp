import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Fetch all certificate templates
export async function GET(request, { params }) {
    try {
        const { schoolId } = params;

        const templates = await prisma.certificateTemplate.findMany({
            where: { schoolId },
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

        return NextResponse.json(templates);
    } catch (error) {
        console.error('Error fetching certificate templates:', error);
        return NextResponse.json(
            { error: 'Failed to fetch templates' },
            { status: 500 }
        );
    }
}

// POST - Create new certificate template
export async function POST(request, { params }) {
    try {
        const { schoolId } = params;
        const body = await request.json();

        const {
            name,
            description,
            type,
            layoutConfig,
            createdById,
            isDefault,
        } = body;

        // If setting as default, unset other defaults
        if (isDefault) {
            await prisma.certificateTemplate.updateMany({
                where: {
                    schoolId,
                    type,
                    isDefault: true,
                },
                data: { isDefault: false },
            });
        }

        const template = await prisma.certificateTemplate.create({
            data: {
                name,
                description,
                type,
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

        return NextResponse.json(template, { status: 201 });
    } catch (error) {
        console.error('Error creating certificate template:', error);
        return NextResponse.json(
            { error: 'Failed to create template' },
            { status: 500 }
        );
    }
}