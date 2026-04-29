import { withSchoolAccess } from "@/lib/api-auth"; // ============================================
// GET /api/schools/[schoolId]/chat/conversations/[conversationId] - Get conversation detail
// DELETE /api/schools/[schoolId]/chat/conversations/[conversationId] - Leave conversation
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateChatRequest, verifyConversationParticipant } from '@/lib/chat/chatAuth';
import { formatConversationForClient } from '@/lib/chat/chatHelpers';
import { invalidatePattern } from '@/lib/cache';

/**
 * GET - Get conversation details (with participant info)
 */export const GET = withSchoolAccess(async function GET(req, { params }) {
  const { schoolId, conversationId } = await params;

  const { dbUser, error } = await authenticateChatRequest(req, schoolId);
  if (error) return error;

  const participant = await verifyConversationParticipant(conversationId, dbUser.id);
  if (!participant || !participant.isActive) {
    return NextResponse.json({ error: 'You are not a participant of this conversation' }, { status: 403 });
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profilePicture: true,
                lastSeenAt: true,
                role: { select: { name: true } },
                parent: {
                  select: {
                    studentLinks: {
                      where: { isActive: true }, take: 1,
                      select: { student: { select: { class: { select: { className: true } }, section: { select: { name: true } } } } }
                    }
                  }
                },
                teacher: {
                  select: { sectionsAssigned: { take: 1, select: { name: true, class: { select: { className: true } } } } }
                }
              }
            }
          }
        },
        class: { select: { id: true, className: true } },
        section: { select: { id: true, name: true } }
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      conversation: formatConversationForClient(conversation, dbUser.id)
    });
  } catch (err) {
    console.error('Get conversation error:', err);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
});

/**
 * DELETE - Leave a conversation (marks participant as inactive)
 */export const DELETE = withSchoolAccess(async function DELETE(req, { params }) {
  const { schoolId, conversationId } = await params;

  const { dbUser, error } = await authenticateChatRequest(req, schoolId);
  if (error) return error;

  try {
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId: dbUser.id }
      },
      data: { isActive: false }
    });

    await invalidatePattern(`chat:conversations*${dbUser.id}*`);

    return NextResponse.json({ success: true, message: 'Left conversation' });
  } catch (err) {
    console.error('Leave conversation error:', err);
    return NextResponse.json({ error: 'Failed to leave conversation' }, { status: 500 });
  }
});