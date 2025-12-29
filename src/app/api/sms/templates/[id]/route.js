import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { invalidatePattern } from '@/lib/cache';

// GET - Get single template
export async function GET(req, { params }) {
    try {
        const { id } = await params;

        // Try cache first
        const cacheKey = `sms:template:${id}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
            return NextResponse.json(JSON.parse(cached));
        }

        const template = await prisma.smsTemplate.findUnique({
            where: { id },
        });

        if (!template) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        // Cache for 5 minutes
        await redis.set(cacheKey, JSON.stringify(template), { ex: 300 });

        return NextResponse.json(template);
    } catch (error) {
        console.error('[SMS TEMPLATE GET ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch template', details: error.message },
            { status: 500 }
        );
    }
}

// PUT - Update template (SUPER_ADMIN only - checked via role in body)
export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, content, variables, category, isActive, role } = body;

        // Check if role is SUPER_ADMIN (frontend sends user role)
        if (role !== 'SUPER_ADMIN') {
            return NextResponse.json(
                { error: 'Only SUPER_ADMIN can update templates' },
                { status: 403 }
            );
        }

        // Check if template exists
        const existing = await prisma.smsTemplate.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        // Build update data
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (content !== undefined) updateData.content = content;
        if (variables !== undefined) updateData.variables = variables;
        if (category !== undefined) updateData.category = category;
        if (isActive !== undefined) updateData.isActive = isActive;

        const template = await prisma.smsTemplate.update({
            where: { id },
            data: updateData,
        });

        // Invalidate cache
        await invalidatePattern('sms:templates:*');
        await redis.del(`sms:template:${id}`);

        return NextResponse.json(template);
    } catch (error) {
        console.error('[SMS TEMPLATE PUT ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to update template', details: error.message },
            { status: 500 }
        );
    }
}

// DELETE - Delete template (SUPER_ADMIN only - checked via role in body)
export async function DELETE(req, { params }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const role = searchParams.get('role');

        // Check if role is SUPER_ADMIN
        if (role !== 'SUPER_ADMIN') {
            return NextResponse.json(
                { error: 'Only SUPER_ADMIN can delete templates' },
                { status: 403 }
            );
        }

        // Check if template exists
        const existing = await prisma.smsTemplate.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        // Check if template is in use by any trigger configs
        const inUse = await prisma.smsTriggerConfig.count({
            where: { templateId: id },
        });

        if (inUse > 0) {
            return NextResponse.json(
                { error: 'Template is in use by trigger configurations. Please remove it from triggers first.' },
                { status: 400 }
            );
        }

        await prisma.smsTemplate.delete({
            where: { id },
        });

        // Invalidate cache
        await invalidatePattern('sms:templates:*');
        await redis.del(`sms:template:${id}`);

        return NextResponse.json({ success: true, message: 'Template deleted successfully' });
    } catch (error) {
        console.error('[SMS TEMPLATE DELETE ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to delete template', details: error.message },
            { status: 500 }
        );
    }
}
