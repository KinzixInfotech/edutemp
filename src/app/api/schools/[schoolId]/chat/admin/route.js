// ============================================
// GET /api/schools/[schoolId]/chat/admin - Admin audit panel
// DELETE /api/schools/[schoolId]/chat/admin/messages/[messageId] - Admin moderate
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateChatRequest, isAdminRole } from '@/lib/chat/chatAuth';

/**
 * GET - Admin: List/search all conversations in school
 * Query params: search, page, limit, type, userId
 */
export async function GET(req, { params }) {
    const { schoolId } = await params;

    const { dbUser, error } = await authenticateChatRequest(req, schoolId);
    if (error) return error;

    const roleName = dbUser.role?.name;
    if (!isAdminRole(roleName)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const userId = searchParams.get('userId');

    try {
        const skip = (page - 1) * limit;

        const where = {
            schoolId,
            ...(type && { type }),
            ...(userId && {
                participants: { some: { userId } },
            }),
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    {
                        participants: {
                            some: {
                                user: { name: { contains: search, mode: 'insensitive' } },
                            },
                        },
                    },
                ],
            }),
        };

        const [conversations, total] = await Promise.all([
            prisma.conversation.findMany({
                where,
                include: {
                    participants: {
                        include: {
                            user: {
                                select: { id: true, name: true, profilePicture: true, role: { select: { name: true } } },
                            },
                        },
                    },
                    _count: { select: { messages: true } },
                },
                orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
                skip,
                take: limit,
            }),
            prisma.conversation.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            conversations: conversations.map(conv => ({
                id: conv.id,
                type: conv.type,
                title: conv.title,
                classId: conv.classId,
                sectionId: conv.sectionId,
                lastMessageAt: conv.lastMessageAt,
                lastMessageText: conv.lastMessageText,
                createdAt: conv.createdAt,
                messageCount: conv._count.messages,
                participants: conv.participants.map(p => ({
                    id: p.userId,
                    name: p.user?.name,
                    profilePicture: p.user?.profilePicture,
                    role: p.user?.role?.name,
                    isActive: p.isActive,
                    joinedAt: p.joinedAt,
                })),
            })),
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (err) {
        console.error('Admin list conversations error:', err);
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }
}
