import { withSchoolAccess } from "@/lib/api-auth"; // ============================================
// PUT /api/schools/[schoolId]/chat/conversations/[conversationId]/deliver - Mark as delivered
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateChatRequest, verifyConversationParticipant } from '@/lib/chat/chatAuth';

/**
 * PUT - Mark messages in a conversation as DELIVERED.
 * Marks all messages not sent by the current user as DELIVERED if they are currently SENT.
 */export const PUT = withSchoolAccess(async function PUT(req, { params }) {
  const { schoolId, conversationId } = await params;

  const { dbUser, error } = await authenticateChatRequest(req, schoolId);
  if (error) return error;

  const participant = await verifyConversationParticipant(conversationId, dbUser.id);
  if (!participant || !participant.isActive) {
    return NextResponse.json({ error: 'You are not a participant of this conversation' }, { status: 403 });
  }

  try {
    const { count } = await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: dbUser.id },
        status: 'SENT'
      },
      data: {
        status: 'DELIVERED'
      }
    });

    return NextResponse.json({
      success: true,
      deliveredCount: count
    });
  } catch (err) {
    console.error('Mark delivered error:', err);
    return NextResponse.json({ error: 'Failed to mark as delivered' }, { status: 500 });
  }
});