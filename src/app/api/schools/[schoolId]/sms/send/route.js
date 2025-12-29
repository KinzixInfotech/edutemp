import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { invalidatePattern } from '@/lib/cache';
import smsService from '@/lib/fast2sms';

// POST - Send SMS
export async function POST(req, { params }) {
    try {
        const { schoolId } = await params;
        const body = await req.json();
        const { templateId, variables, recipients, preview } = body;

        if (!schoolId || schoolId === 'null') {
            return NextResponse.json({ error: 'Invalid schoolId' }, { status: 400 });
        }

        if (!templateId) {
            return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
        }

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json({ error: 'Recipients array is required' }, { status: 400 });
        }

        // Get template
        const template = await prisma.smsTemplate.findUnique({
            where: { id: templateId }
        });

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        if (!template.isActive) {
            return NextResponse.json({ error: 'Template is inactive' }, { status: 400 });
        }

        // Validate variables
        const varsValidation = smsService.validateVariables(template.variables, variables || {});
        if (!varsValidation.valid) {
            return NextResponse.json(
                { error: 'Variable validation failed', details: varsValidation.errors },
                { status: 400 }
            );
        }

        // Special validation for NOTICE category
        if (template.category === 'NOTICE' && variables?.NOTICE_TEXT) {
            const noticeValidation = smsService.validateNoticeText(variables.NOTICE_TEXT);
            if (!noticeValidation.valid) {
                return NextResponse.json(
                    { error: 'Notice text validation failed', details: noticeValidation.errors },
                    { status: 400 }
                );
            }
        }

        // Render message
        const message = smsService.renderTemplate(template.content, variables || {});

        // Calculate cost
        const cost = smsService.calculateCost(recipients.length);

        // If preview mode, return preview data
        if (preview) {
            return NextResponse.json({
                preview: true,
                template: template.name,
                message,
                recipientCount: recipients.length,
                cost,
                costPerSms: smsService.COST_PER_SMS
            });
        }

        // Check wallet balance
        const wallet = await prisma.smsWallet.findUnique({
            where: { schoolId }
        });

        if (!wallet || wallet.balance < cost) {
            return NextResponse.json(
                {
                    error: 'Insufficient credits',
                    required: cost,
                    available: wallet?.balance || 0
                },
                { status: 402 }
            );
        }

        // Create log entry first (PENDING)
        const smsLog = await prisma.smsLog.create({
            data: {
                schoolId,
                templateId,
                recipients,
                message,
                status: 'PENDING',
                cost
            }
        });

        try {
            // Send SMS via Fast2SMS
            const result = await smsService.sendSms({
                apiKey: process.env.FAST2SMS_API_KEY,
                senderId: process.env.FAST2SMS_SENDER_ID,
                dltTemplateId: template.dltTemplateId,
                message,
                numbers: recipients
            });

            // Update log and wallet
            await prisma.$transaction([
                prisma.smsLog.update({
                    where: { id: smsLog.id },
                    data: {
                        status: 'SENT',
                        fast2smsId: result.messageId
                    }
                }),
                prisma.smsWallet.update({
                    where: { id: wallet.id },
                    data: {
                        balance: { decrement: cost },
                        usedCredits: { increment: cost }
                    }
                }),
                prisma.smsWalletTransaction.create({
                    data: {
                        walletId: wallet.id,
                        type: 'USAGE',
                        amount: -cost,
                        description: `SMS sent: ${template.name} (${recipients.length} recipients)`
                    }
                })
            ]);

            // Invalidate cache
            await invalidatePattern(`sms:wallet:*`);

            return NextResponse.json({
                success: true,
                logId: smsLog.id,
                messageId: result.messageId,
                recipientCount: recipients.length,
                cost
            });
        } catch (sendError) {
            // Update log with failure
            await prisma.smsLog.update({
                where: { id: smsLog.id },
                data: {
                    status: 'FAILED',
                    errorMessage: sendError.message
                }
            });

            return NextResponse.json(
                { error: 'SMS sending failed', details: sendError.message },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[SMS SEND ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to send SMS', details: error.message },
            { status: 500 }
        );
    }
}
