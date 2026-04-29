import { withSchoolAccess } from "@/lib/api-auth"; // ============================================
// DELETE /api/schools/[schoolId]/chat/admin/messages/[messageId] - Admin moderation
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateChatRequest, isAdminRole } from '@/lib/chat/chatAuth';
import { invalidatePattern } from '@/lib/cache';

/**
 * DELETE - Admin moderation: soft-delete an inappropriate message
 */export const DELETE = withSchoolAccess(async function DELETE(req, { params }) {
  const { schoolId, messageId } = await params;

  const { dbUser, error } = await authenticateChatRequest(req, schoolId);
  if (error) return error;

  const roleName = dbUser.role?.name;
  if (!isAdminRole(roleName)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        deletedAt: true,
        conversation: {
          select: { schoolId: true }
        }
      }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.conversation.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Message does not belong to this school' }, { status: 403 });
    }

    if (message.deletedAt) {
      return NextResponse.json({ error: 'Message already deleted' }, { status: 400 });
    }

    await prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        deletedById: dbUser.id
      }
    });

    await invalidatePattern(`chat:conversations*`);

    return NextResponse.json({
      success: true,
      message: 'Message moderated by admin'
    });
  } catch (err) {
    console.error('Admin moderate message error:', err);
    return NextResponse.json({ error: 'Failed to moderate message' }, { status: 500 });
  }
});

/**
 * GET - Admin: View messages in any conversation
 * Query params: conversationId, cursor, limit
 */export const GET = withSchoolAccess(async function GET(req, { params }) {
  const { schoolId, messageId: conversationId } = await params;

  const { dbUser, error } = await authenticateChatRequest(req, schoolId);
  if (error) return error;

  const roleName = dbUser.role?.name;
  if (!isAdminRole(roleName)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const limit = parseInt(searchParams.get('limit') || '30');

  try {
    // Verify conversation belongs to school
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, schoolId }
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found in this school' }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, name: true, profilePicture: true, role: { select: { name: true } } }
        }
      }
    });

    const formatted = messages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      sender: msg.sender,
      content: msg.content,
      attachments: msg.attachments,
      isDeleted: !!msg.deletedAt,
      deletedAt: msg.deletedAt,
      deletedById: msg.deletedById,
      createdAt: msg.createdAt
    }));

    const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null;

    return NextResponse.json({
      success: true,
      messages: formatted,
      nextCursor,
      hasMore: !!nextCursor
    });
  } catch (err) {
    console.error('Admin view messages error:', err);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
});