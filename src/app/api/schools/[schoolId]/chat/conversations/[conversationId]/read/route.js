import { withSchoolAccess } from "@/lib/api-auth"; // ============================================
// PUT /api/schools/[schoolId]/chat/conversations/[conversationId]/read - Mark as read
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateChatRequest, verifyConversationParticipant } from '@/lib/chat/chatAuth';
import { invalidatePattern } from '@/lib/cache';

/**
 * PUT - Mark messages as read (update lastReadAt and lastReadMsgId)
 * Body: { messageId?: string }   — If provided, marks up to that message. Otherwise marks all.
 */export const PUT = withSchoolAccess(async function PUT(req, { params }) {
  const { schoolId, conversationId } = await params;

  const { dbUser, error } = await authenticateChatRequest(req, schoolId);
  if (error) return error;

  const participant = await verifyConversationParticipant(conversationId, dbUser.id);
  if (!participant || !participant.isActive) {
    return NextResponse.json({ error: 'You are not a participant of this conversation' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { messageId } = body;

    const updateData = {
      lastReadAt: new Date()
    };

    if (messageId) {
      // Verify message exists in this conversation
      const msg = await prisma.message.findFirst({
        where: { id: messageId, conversationId }
      });
      if (msg) {
        updateData.lastReadMsgId = messageId;
      }
    } else {
      // Get latest message id
      const latestMsg = await prisma.message.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        select: { id: true }
      });
      if (latestMsg) {
        updateData.lastReadMsgId = latestMsg.id;
      }
    }

    await prisma.$transaction([
    prisma.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId: dbUser.id }
      },
      data: updateData
    }),
    prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: dbUser.id },
        createdAt: { lte: updateData.lastReadAt },
        status: { not: 'READ' }
      },
      data: { status: 'READ' }
    })]
    );

    await invalidatePattern(`chat:conversations*${dbUser.id}*`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
});