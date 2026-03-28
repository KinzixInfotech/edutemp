// ============================================
// GET /api/schools/[schoolId]/chat/conversations/[conversationId]/messages - List messages
// POST /api/schools/[schoolId]/chat/conversations/[conversationId]/messages - Send message
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateChatRequest, verifyConversationParticipant } from '@/lib/chat/chatAuth';
import { checkMessageRateLimit, sanitizeMessageContent } from '@/lib/chat/chatHelpers';
import { PAGINATION, MAX_MESSAGE_LENGTH, MAX_ATTACHMENTS_PER_MESSAGE, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/chat/chatConstants';
import { invalidatePattern } from '@/lib/cache';
import { enqueueNotificationJob } from '@/lib/notifications/notificationHelper';

/**
 * GET - List messages for a conversation (cursor-based pagination)
 * Query params: cursor (messageId), limit
 */
export async function GET(req, { params }) {
    const { schoolId, conversationId } = await params;

    const { dbUser, error } = await authenticateChatRequest(req, schoolId);
    if (error) return error;

    // Verify participant
    const participant = await verifyConversationParticipant(conversationId, dbUser.id);
    if (!participant || !participant.isActive) {
        return NextResponse.json({ error: 'You are not a participant of this conversation' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || String(PAGINATION.MESSAGES_PER_PAGE));

    try {
        const messages = await prisma.message.findMany({
            where: {
                conversationId,
            },
            ...(cursor && {
                cursor: { id: cursor },
                skip: 1, // Skip the cursor itself
            }),
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        profilePicture: true,
                        role: { select: { name: true } },
                    },
                },
                replyTo: {
                    select: {
                        id: true,
                        content: true,
                        senderId: true,
                        sender: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
        });

        // Format messages (handle soft deletes)
        const formatted = messages.map(msg => ({
            id: msg.id,
            conversationId: msg.conversationId,
            senderId: msg.senderId,
            sender: msg.sender,
            content: msg.deletedAt ? null : msg.content,
            attachments: msg.deletedAt ? null : msg.attachments,
            isDeleted: !!msg.deletedAt,
            deletedAt: msg.deletedAt,
            status: msg.status,
            replyTo: msg.replyTo ? {
                id: msg.replyTo.id,
                content: msg.replyTo.content,
                senderName: msg.replyTo.sender?.name,
            } : null,
            createdAt: msg.createdAt,
            updatedAt: msg.updatedAt,
        }));

        const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null;

        return NextResponse.json({
            success: true,
            messages: formatted,
            nextCursor,
            hasMore: !!nextCursor,
        });
    } catch (err) {
        console.error('List messages error:', err);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

/**
 * POST - Send a message
 * Body: {
 *   content: string,
 *   attachments?: [{ url, fileName, fileSize, mimeType }],
 *   replyToId?: string
 * }
 */
export async function POST(req, { params }) {
    const { schoolId, conversationId } = await params;

    const { dbUser, error } = await authenticateChatRequest(req, schoolId);
    if (error) return error;

    // Verify participant
    const participant = await verifyConversationParticipant(conversationId, dbUser.id);
    if (!participant || !participant.isActive) {
        return NextResponse.json({ error: 'You are not a participant of this conversation' }, { status: 403 });
    }

    // Rate limit
    const { allowed, remaining } = await checkMessageRateLimit(dbUser.id);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded. Please wait before sending more messages.' },
            { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
        );
    }

    try {
        const body = await req.json();
        const { content, attachments, replyToId, _directMessageId } = body;

        // If message was already inserted directly via Supabase, just handle side effects
        if (_directMessageId) {
            const existingMsg = await prisma.message.findUnique({
                where: { id: _directMessageId },
                include: {
                    sender: {
                        select: {
                            id: true,
                            name: true,
                            profilePicture: true,
                            role: { select: { name: true } },
                        },
                    },
                },
            });

            if (existingMsg && existingMsg.conversationId === conversationId) {
                // Update conversation metadata and read position
                const sanitized = sanitizeMessageContent(existingMsg.content || '');
                await prisma.$transaction([
                    prisma.conversation.update({
                        where: { id: conversationId },
                        data: {
                            lastMessageAt: existingMsg.createdAt,
                            lastMessageText: sanitized.slice(0, 100) || (existingMsg.attachments ? '📎 Attachment' : ''),
                        },
                    }),
                    prisma.conversationParticipant.update({
                        where: {
                            conversationId_userId: { conversationId, userId: dbUser.id },
                        },
                        data: {
                            lastReadAt: new Date(),
                            lastReadMsgId: existingMsg.id,
                        },
                    }),
                ]);

                // Invalidate caches
                await invalidatePattern(`chat:conversations*`);

                // Trigger push notification (non-blocking)
                triggerChatPushNotification(conversationId, dbUser, sanitized, existingMsg.id).catch(err => {
                    console.error('Failed to trigger chat push notification:', err);
                });

                return NextResponse.json({ success: true, message: { id: existingMsg.id }, persisted: true });
            }
            // If message not found, fall through to create normally
        }

        // Validate content
        const sanitizedContent = sanitizeMessageContent(content);
        if (!sanitizedContent && (!attachments || attachments.length === 0)) {
            return NextResponse.json({ error: 'Message content or attachments required' }, { status: 400 });
        }

        if (sanitizedContent.length > MAX_MESSAGE_LENGTH) {
            return NextResponse.json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` }, { status: 400 });
        }

        // Validate attachments
        if (attachments && attachments.length > 0) {
            if (attachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
                return NextResponse.json({ error: `Max ${MAX_ATTACHMENTS_PER_MESSAGE} attachments per message` }, { status: 400 });
            }

            for (const att of attachments) {
                if (!att.url || !att.fileName || !att.mimeType) {
                    return NextResponse.json({ error: 'Each attachment must have url, fileName, and mimeType' }, { status: 400 });
                }
                if (!ALLOWED_FILE_TYPES.includes(att.mimeType)) {
                    return NextResponse.json({ error: `File type ${att.mimeType} not allowed` }, { status: 400 });
                }
                if (att.fileSize && att.fileSize > MAX_FILE_SIZE) {
                    return NextResponse.json({ error: `File ${att.fileName} exceeds 10MB limit` }, { status: 400 });
                }
            }
        }

        // Validate replyToId
        if (replyToId) {
            const replyMsg = await prisma.message.findFirst({
                where: { id: replyToId, conversationId },
            });
            if (!replyMsg) {
                return NextResponse.json({ error: 'Reply message not found in this conversation' }, { status: 400 });
            }
        }

        // Create message and update conversation in a transaction
        const message = await prisma.$transaction(async (tx) => {
            const msg = await tx.message.create({
                data: {
                    conversationId,
                    senderId: dbUser.id,
                    content: sanitizedContent,
                    attachments: attachments || undefined,
                    replyToId: replyToId || null,
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            name: true,
                            profilePicture: true,
                            role: { select: { name: true } },
                        },
                    },
                    replyTo: {
                        select: {
                            id: true,
                            content: true,
                            sender: { select: { id: true, name: true } },
                        },
                    },
                },
            });

            // Update conversation metadata
            await tx.conversation.update({
                where: { id: conversationId },
                data: {
                    lastMessageAt: new Date(),
                    lastMessageText: sanitizedContent.slice(0, 100) || (attachments ? '📎 Attachment' : ''),
                },
            });

            // Update sender's read position
            await tx.conversationParticipant.update({
                where: {
                    conversationId_userId: { conversationId, userId: dbUser.id },
                },
                data: {
                    lastReadAt: new Date(),
                    lastReadMsgId: msg.id,
                },
            });

            return msg;
        });

        // Invalidate caches
        await invalidatePattern(`chat:conversations*`);

        // Trigger push notification (non-blocking)
        triggerChatPushNotification(conversationId, dbUser, sanitizedContent, message.id).catch(err => {
            console.error('Failed to trigger chat push notification:', err);
        });

        return NextResponse.json({
            success: true,
            message: {
                id: message.id,
                conversationId: message.conversationId,
                senderId: message.senderId,
                sender: message.sender,
                content: message.content,
                attachments: message.attachments,
                isDeleted: false,
                status: message.status,
                replyTo: message.replyTo ? {
                    id: message.replyTo.id,
                    content: message.replyTo.content,
                    senderName: message.replyTo.sender?.name,
                } : null,
                createdAt: message.createdAt,
            },
        }, { status: 201 });
    } catch (err) {
        console.error('Send message error:', err);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}

/**
 * Trigger push notification for chat message via existing QStash worker.
 */
async function triggerChatPushNotification(conversationId, sender, content, messageId) {
    // Get all participants except sender, check mute settings
    const participants = await prisma.conversationParticipant.findMany({
        where: {
            conversationId,
            isActive: true,
            userId: { not: sender.id },
        },
        select: {
            userId: true,
            mutedUntil: true,
        },
    });

    const now = new Date();
    const eligibleUserIds = participants
        .filter(p => !p.mutedUntil || new Date(p.mutedUntil) <= now)
        .map(p => p.userId);

    if (eligibleUserIds.length === 0) return;

    // Get conversation for title
    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { type: true, title: true, schoolId: true },
    });

    const title = sender.name || 'New Message';
    const messagePreview = content?.slice(0, 100) || '📎 Sent an attachment';

    await enqueueNotificationJob({
        schoolId: conversation.schoolId,
        title,
        message: messagePreview,
        type: 'CHAT_MESSAGE',
        jobType: 'CHAT_MESSAGE',
        imageUrl: sender.profilePicture || null,
        targetOptions: {
            userIds: eligibleUserIds,
            excludeUserIds: [sender.id]
        },
        data: {
            conversationId,
            messageId,
            senderId: sender.id,
            senderName: sender.name,
            senderProfilePicture: sender.profilePicture || '',
        },
    });
}
