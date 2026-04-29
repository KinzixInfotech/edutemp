import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateChatRequest } from '@/lib/chat/chatAuth';
import { invalidatePattern } from '@/lib/cache';

export const PUT = withSchoolAccess(async function PUT(req, { params }) {
  const { schoolId } = await params;

  const { dbUser, error } = await authenticateChatRequest(req, schoolId);
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const conversationIds = Array.isArray(body?.conversationIds) ?
    [...new Set(body.conversationIds.filter((id) => typeof id === 'string' && id.trim()))] :
    [];

    if (!conversationIds.length) {
      return NextResponse.json({ error: 'conversationIds must be a non-empty array' }, { status: 400 });
    }

    const participantRows = await prisma.conversationParticipant.findMany({
      where: {
        userId: dbUser.id,
        isActive: true,
        conversationId: { in: conversationIds }
      },
      select: { conversationId: true }
    });

    const allowedConversationIds = participantRows.map((participant) => participant.conversationId);
    const deniedConversationIds = conversationIds.filter((id) => !allowedConversationIds.includes(id));

    if (!allowedConversationIds.length) {
      return NextResponse.json({ error: 'You are not a participant of these conversations' }, { status: 403 });
    }

    const latestMessages = await prisma.message.findMany({
      where: {
        conversationId: { in: allowedConversationIds }
      },
      orderBy: [
      { conversationId: 'asc' },
      { createdAt: 'desc' }],

      select: { id: true, conversationId: true }
    });

    const latestMessageByConversation = new Map();
    latestMessages.forEach((message) => {
      if (!latestMessageByConversation.has(message.conversationId)) {
        latestMessageByConversation.set(message.conversationId, message.id);
      }
    });

    const readAt = new Date();

    await prisma.$transaction([
    ...allowedConversationIds.map((conversationId) =>
    prisma.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId: dbUser.id }
      },
      data: {
        lastReadAt: readAt,
        ...(latestMessageByConversation.get(conversationId) ?
        { lastReadMsgId: latestMessageByConversation.get(conversationId) } :
        {})
      }
    })
    ),
    prisma.message.updateMany({
      where: {
        conversationId: { in: allowedConversationIds },
        senderId: { not: dbUser.id },
        createdAt: { lte: readAt },
        status: { not: 'READ' }
      },
      data: { status: 'READ' }
    })]
    );

    await invalidatePattern(`chat:conversations*${dbUser.id}*`);

    return NextResponse.json({
      success: true,
      processedCount: allowedConversationIds.length,
      conversationIds: allowedConversationIds,
      deniedConversationIds
    });
  } catch (err) {
    console.error('Bulk mark read error:', err);
    return NextResponse.json({ error: 'Failed to mark conversations as read' }, { status: 500 });
  }
});