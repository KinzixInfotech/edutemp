import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey, invalidatePattern } from '@/lib/cache';

const TRIGGER_TYPES = [
    'ATTENDANCE_ABSENT',
    'FEE_DUE_REMINDER',
    'FEE_OVERDUE',
    'OTP_LOGIN',
    'NOTICE_BROADCAST',
    'HOLIDAY_ANNOUNCEMENT'
];

// GET - Get trigger configurations
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        if (!schoolId || schoolId === 'null') {
            return NextResponse.json({ error: 'Invalid schoolId' }, { status: 400 });
        }

        const cacheKey = generateKey('sms:triggers', { schoolId });

        const data = await remember(cacheKey, async () => {
            // Get existing configs
            const configs = await prisma.smsTriggerConfig.findMany({
                where: { schoolId },
                include: {
                    template: {
                        select: { id: true, name: true, category: true }
                    }
                }
            });

            // Create config map
            const configMap = {};
            configs.forEach(c => {
                configMap[c.triggerType] = c;
            });

            // Return all trigger types with their config status
            return TRIGGER_TYPES.map(type => ({
                triggerType: type,
                isEnabled: configMap[type]?.isEnabled || false,
                templateId: configMap[type]?.templateId || null,
                templateName: configMap[type]?.template?.name || null,
                configId: configMap[type]?.id || null
            }));
        }, 120); // Cache for 2 minutes

        return NextResponse.json(data);
    } catch (error) {
        console.error('[SMS TRIGGERS GET ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch triggers', details: error.message },
            { status: 500 }
        );
    }
}

// PUT - Update trigger configuration
export async function PUT(req, { params }) {
    try {
        const { schoolId } = await params;
        const body = await req.json();
        const { triggerType, isEnabled, templateId } = body;

        if (!schoolId || schoolId === 'null') {
            return NextResponse.json({ error: 'Invalid schoolId' }, { status: 400 });
        }

        if (!triggerType || !TRIGGER_TYPES.includes(triggerType)) {
            return NextResponse.json(
                { error: 'Invalid trigger type' },
                { status: 400 }
            );
        }

        // If enabling, templateId is required
        if (isEnabled && !templateId) {
            return NextResponse.json(
                { error: 'Template ID is required when enabling a trigger' },
                { status: 400 }
            );
        }

        // Validate template exists if provided
        if (templateId) {
            const template = await prisma.smsTemplate.findUnique({
                where: { id: templateId }
            });
            if (!template) {
                return NextResponse.json({ error: 'Template not found' }, { status: 404 });
            }
        }

        // Upsert trigger config
        const config = await prisma.smsTriggerConfig.upsert({
            where: {
                schoolId_triggerType: {
                    schoolId,
                    triggerType
                }
            },
            update: {
                isEnabled: isEnabled ?? false,
                templateId
            },
            create: {
                schoolId,
                triggerType,
                isEnabled: isEnabled ?? false,
                templateId
            },
            include: {
                template: {
                    select: { name: true }
                }
            }
        });

        // Invalidate cache
        await invalidatePattern(`sms:triggers:*`);

        return NextResponse.json({
            triggerType: config.triggerType,
            isEnabled: config.isEnabled,
            templateId: config.templateId,
            templateName: config.template?.name
        });
    } catch (error) {
        console.error('[SMS TRIGGERS PUT ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to update trigger', details: error.message },
            { status: 500 }
        );
    }
}
