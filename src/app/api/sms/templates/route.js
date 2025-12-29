import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { remember, generateKey, invalidatePattern } from '@/lib/cache';

// GET - List all SMS templates (accessible to all authenticated users)
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const activeOnly = searchParams.get('activeOnly') !== 'false';

        const cacheKey = generateKey('sms:templates', { category, activeOnly });

        const templates = await remember(cacheKey, async () => {
            const where = {};
            if (category) where.category = category;
            if (activeOnly) where.isActive = true;

            return prisma.smsTemplate.findMany({
                where,
                orderBy: { name: 'asc' },
                select: {
                    id: true,
                    name: true,
                    dltTemplateId: true,
                    content: true,
                    variables: true,
                    category: true,
                    isActive: true,
                    createdAt: true
                }
            });
        }, 300); // Cache for 5 minutes

        return NextResponse.json(templates);
    } catch (error) {
        console.error('[SMS TEMPLATES GET ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch templates', details: error.message },
            { status: 500 }
        );
    }
}

// POST - Create new SMS template (SUPER_ADMIN only - checked via role in body)
export async function POST(req) {
    try {
        const body = await req.json();
        const { name, dltTemplateId, content, variables, category, role } = body;

        // Check if role is SUPER_ADMIN (frontend sends user role)
        if (role !== 'SUPER_ADMIN') {
            return NextResponse.json(
                { error: 'Only SUPER_ADMIN can create templates' },
                { status: 403 }
            );
        }

        if (!name || !dltTemplateId || !content || !category) {
            return NextResponse.json(
                { error: 'Missing required fields: name, dltTemplateId, content, category' },
                { status: 400 }
            );
        }

        // Check if template ID already exists
        const existing = await prisma.smsTemplate.findUnique({
            where: { dltTemplateId }
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Template with this DLT ID already exists' },
                { status: 409 }
            );
        }

        const template = await prisma.smsTemplate.create({
            data: {
                name,
                dltTemplateId,
                content,
                variables: variables || [],
                category,
                isActive: true
            }
        });

        // Invalidate cache
        await invalidatePattern('sms:templates:*');

        return NextResponse.json(template, { status: 201 });
    } catch (error) {
        console.error('[SMS TEMPLATES POST ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to create template', details: error.message },
            { status: 500 }
        );
    }
}
