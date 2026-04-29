import { withSchoolAccess } from "@/lib/api-auth"; // ============================================
// DELETE /api/schools/[schoolId]/chat/messages/[messageId] - Soft delete message
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateChatRequest, isAdminRole } from '@/lib/chat/chatAuth';
import { invalidatePattern } from '@/lib/cache';

/**
 * DELETE - Soft delete a message (set deletedAt, deletedById)
 * Only the sender or an admin can delete.
 */export const DELETE = withSchoolAccess(async function DELETE(req, { params }) {
  const { schoolId, messageId } = await params;

  const { dbUser, error } = await authenticateChatRequest(req, schoolId);
  if (error) return error;

  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        conversationId: true,
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

    // Only sender or admin can delete
    const roleName = dbUser.role?.name;
    if (message.senderId !== dbUser.id && !isAdminRole(roleName)) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
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
      message: 'Message deleted'
    });
  } catch (err) {
    console.error('Delete message error:', err);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
});