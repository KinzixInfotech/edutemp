import { withSchoolAccess } from "@/lib/api-auth"; // ============================================
// PUT /api/schools/[schoolId]/chat/conversations/[conversationId]/mute - Mute/unmute
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateChatRequest, verifyConversationParticipant } from '@/lib/chat/chatAuth';
import { MUTE_DURATIONS } from '@/lib/chat/chatConstants';
import { invalidatePattern } from '@/lib/cache';

/**
 * PUT - Mute or unmute a conversation
 * Body: { duration: '1h' | '8h' | '1d' | 'forever' | 'unmute' }
 */export const PUT = withSchoolAccess(async function PUT(req, { params }) {
  const { schoolId, conversationId } = await params;

  const { dbUser, error } = await authenticateChatRequest(req, schoolId);
  if (error) return error;

  const participant = await verifyConversationParticipant(conversationId, dbUser.id);
  if (!participant || !participant.isActive) {
    return NextResponse.json({ error: 'You are not a participant of this conversation' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { duration } = body;

    if (!duration) {
      return NextResponse.json({ error: 'duration is required' }, { status: 400 });
    }

    let mutedUntil = null;

    if (duration !== 'unmute') {
      const ms = MUTE_DURATIONS[duration];
      if (!ms) {
        return NextResponse.json(
          { error: 'Invalid duration. Use: 1h, 8h, 1d, forever, or unmute' },
          { status: 400 }
        );
      }
      mutedUntil = new Date(Date.now() + ms);
    }

    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId: dbUser.id }
      },
      data: { mutedUntil }
    });

    await invalidatePattern(`chat:conversations*${dbUser.id}*`);

    return NextResponse.json({
      success: true,
      muted: !!mutedUntil,
      mutedUntil
    });
  } catch (err) {
    console.error('Mute conversation error:', err);
    return NextResponse.json({ error: 'Failed to update mute settings' }, { status: 500 });
  }
});