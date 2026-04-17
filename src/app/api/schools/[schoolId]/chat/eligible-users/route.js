// ============================================
// /api/schools/[schoolId]/chat/eligible-users
//   GET  - fetch users the current user can message
//   POST - create a conversation (duplicate-safe, busts cache after)
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateChatRequest } from '@/lib/chat/chatAuth';
import {
    getEligibleUsers,
    validateConversationPermission,
    formatConversationForClient,
} from '@/lib/chat/chatHelpers';
import { remember, generateKey, delCache } from '@/lib/cache';
import { CONVERSATION_TYPES } from '@/lib/chat/chatConstants';

// ── consistent cache key builder ──
function eligibleUsersCacheKey(userId, schoolId, roleName) {
    return generateKey('chat:eligible-users', { userId, schoolId, role: roleName });
}

// ============================================
// GET - eligible users to message
// ============================================
export async function GET(req, { params }) {
    const { schoolId } = await params;

    const { dbUser, error } = await authenticateChatRequest(req, schoolId);
    if (error) return error;

    try {
        const roleName = dbUser.role?.name;
        const cacheKey = eligibleUsersCacheKey(dbUser.id, schoolId, roleName);

        const url = new URL(req.url);
        const isRefresh = url.searchParams.get('refresh') === 'true';

        if (isRefresh) {
            await delCache(cacheKey);
        }

        const result = await remember(
            cacheKey,
            async () => {
                const users = await getEligibleUsers(dbUser.id, schoolId, roleName);
                return { success: true, users };
            },
            120 // 2 minutes
        );

        return NextResponse.json(result);
    } catch (err) {
        console.error('Get eligible users error:', err);
        return NextResponse.json({ error: 'Failed to fetch eligible users' }, { status: 500 });
    }
}

// ============================================
// POST - create a conversation
// ============================================
export async function POST(req, { params }) {
    const { schoolId } = await params;

    const { dbUser, error } = await authenticateChatRequest(req, schoolId);
    if (error) return error;

    try {
        const body = await req.json();
        const { type, participantUserIds = [], title, classId, sectionId } = body;

        // ── Validation ──
        if (!type) {
            return NextResponse.json({ error: 'Conversation type is required' }, { status: 400 });
        }
        if (!Object.values(CONVERSATION_TYPES).includes(type)) {
            return NextResponse.json({ error: 'Invalid conversation type' }, { status: 400 });
        }
        if (!Array.isArray(participantUserIds) || participantUserIds.length === 0) {
            return NextResponse.json({ error: 'At least one participant is required' }, { status: 400 });
        }

        const roleName = dbUser.role?.name;

        // ── Permission check ──
        const permission = await validateConversationPermission(
            dbUser.id, schoolId, roleName, type, participantUserIds, { classId, sectionId }
        );
        if (!permission.valid) {
            return NextResponse.json({ error: permission.error }, { status: 403 });
        }

        // ── Duplicate prevention for all 1-to-1 non-COMMUNITY types ──
        if (type !== CONVERSATION_TYPES.COMMUNITY && participantUserIds.length === 1) {
            const otherUserId = participantUserIds[0];

            const existing = await prisma.conversation.findFirst({
                where: {
                    schoolId,
                    type,
                    AND: [
                        { participants: { some: { userId: dbUser.id, isActive: true } } },
                        { participants: { some: { userId: otherUserId, isActive: true } } },
                        { participants: { none: { userId: { notIn: [dbUser.id, otherUserId] }, isActive: true } } },
                    ],
                },
                orderBy: [
                    { lastMessageAt: 'desc' },
                    { createdAt: 'desc' },
                ],
                include: {
                    participants: {
                        where: { isActive: true },
                        select: {
                            userId: true,
                            role: true,
                            joinedAt: true,
                            mutedUntil: true,
                            lastReadAt: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    profilePicture: true,
                                    role: { select: { name: true } },
                                },
                            },
                        },
                    },
                },
            });

            if (existing) {
                return NextResponse.json(
                    { conversation: formatConversationForClient(existing, dbUser.id), alreadyExists: true },
                    { status: 200 }
                );
            }
        }

        // ── Verify all target users belong to this school ──
        const targetUsers = await prisma.user.findMany({
            where: { id: { in: participantUserIds }, schoolId },
            select: { id: true, role: { select: { name: true } } },
        });
        if (targetUsers.length !== participantUserIds.length) {
            return NextResponse.json(
                { error: 'One or more participants not found in this school' },
                { status: 400 }
            );
        }

        // ── Create conversation ──
        const allParticipantIds = [...new Set([dbUser.id, ...participantUserIds])];

        const conversation = await prisma.conversation.create({
            data: {
                schoolId,
                type,
                title: title?.trim() || null,
                classId: classId || null,
                sectionId: sectionId || null,
                createdById: dbUser.id,
                participants: {
                    create: allParticipantIds.map((uid) => ({
                        userId: uid,
                        role: uid === dbUser.id ? 'ADMIN' : 'MEMBER',
                    })),
                },
            },
            include: {
                participants: {
                    where: { isActive: true },
                    select: {
                        userId: true,
                        role: true,
                        joinedAt: true,
                        mutedUntil: true,
                        lastReadAt: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                profilePicture: true,
                                role: { select: { name: true } },
                            },
                        },
                    },
                },
            },
        });

        // ── Bust eligible-users cache for ALL participants ──
        // so the OPEN badge shows immediately on next visit for both users
        await Promise.allSettled(
            targetUsers.concat({ id: dbUser.id, role: { name: roleName } }).map((u) =>
                delCache(eligibleUsersCacheKey(u.id, schoolId, u.role?.name))
            )
        );

        return NextResponse.json(
            { conversation: formatConversationForClient(conversation, dbUser.id), alreadyExists: false },
            { status: 201 }
        );
    } catch (err) {
        console.error('Create conversation error:', err);
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }
}