import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { authenticateChatRequest, verifyConversationParticipant } from '@/lib/chat/chatAuth';

const ACTIVE_TTL_SECONDS = 45;
const getActiveConversationKey = (conversationId, userId) => `chat:active:${conversationId}:${userId}`;

export const POST = withSchoolAccess(async function POST(req, { params }) {
  const { schoolId, conversationId } = await params;

  const { dbUser, error } = await authenticateChatRequest(req, schoolId);
  if (error) return error;

  const participant = await verifyConversationParticipant(conversationId, dbUser.id);
  if (!participant || !participant.isActive) {
    return NextResponse.json({ error: 'You are not a participant of this conversation' }, { status: 403 });
  }

  await redis.set(getActiveConversationKey(conversationId, dbUser.id), '1', { ex: ACTIVE_TTL_SECONDS });

  return NextResponse.json({ success: true, ttl: ACTIVE_TTL_SECONDS });
});

export const DELETE = withSchoolAccess(async function DELETE(req, { params }) {
  const { schoolId, conversationId } = await params;

  const { dbUser, error } = await authenticateChatRequest(req, schoolId);
  if (error) return error;

  await redis.del(getActiveConversationKey(conversationId, dbUser.id));

  return NextResponse.json({ success: true });
});