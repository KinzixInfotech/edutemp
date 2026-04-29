import { withSchoolAccess } from "@/lib/api-auth"; // ============================================
// GET /api/schools/[schoolId]/chat/conversations - List conversations
// POST /api/schools/[schoolId]/chat/conversations - Create conversation
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateChatRequest } from '@/lib/chat/chatAuth';
import { validateConversationPermission, formatConversationForClient } from '@/lib/chat/chatHelpers';
import { PAGINATION, CONVERSATION_TYPES } from '@/lib/chat/chatConstants';
import { remember, generateKey, invalidatePattern } from '@/lib/cache';

/**
 * GET - List conversations for authenticated user
 * Query params: page, limit, type
 */export const GET = withSchoolAccess(async function GET(req, { params }) {
  const { schoolId } = await params;

  const { dbUser, error } = await authenticateChatRequest(req, schoolId);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || String(PAGINATION.CONVERSATIONS_PER_PAGE));
  const type = searchParams.get('type');

  try {
    const cacheKey = generateKey('chat:conversations', { userId: dbUser.id, schoolId, page, limit, type });

    const result = await remember(cacheKey, async () => {
      const skip = (page - 1) * limit;

      const where = {
        schoolId,
        participants: {
          some: {
            userId: dbUser.id,
            isActive: true
          }
        },
        ...(type && { type })
      };

      const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
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
                        where: { isActive: true },
                        take: 1,
                        select: {
                          student: {
                            select: {
                              class: { select: { className: true } },
                              section: { select: { name: true } }
                            }
                          }
                        }
                      }
                    }
                  },
                  teacher: {
                    select: {
                      sectionsAssigned: {
                        take: 1,
                        select: { name: true, class: { select: { className: true } } }
                      }
                    }
                  }
                }
              }
            }
          },
          class: {
            select: { id: true, className: true }
          },
          section: {
            select: { id: true, name: true }
          }
        },
        orderBy: [
        { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' }],

        skip,
        take: limit
      }),
      prisma.conversation.count({ where })]
      );

      // Calculate unread counts per conversation
      const formatted = await Promise.all(
        conversations.map(async (conv) => {
          const myParticipant = conv.participants.find((p) => p.userId === dbUser.id);
          let unreadCount = 0;

          if (myParticipant?.lastReadAt) {
            unreadCount = await prisma.message.count({
              where: {
                conversationId: conv.id,
                createdAt: { gt: myParticipant.lastReadAt },
                senderId: { not: dbUser.id },
                deletedAt: null
              }
            });
          } else {
            unreadCount = await prisma.message.count({
              where: {
                conversationId: conv.id,
                senderId: { not: dbUser.id },
                deletedAt: null
              }
            });
          }

          const base = formatConversationForClient(conv, dbUser.id);
          return { ...base, unreadCount };
        })
      );

      return {
        success: true,
        conversations: formatted,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    }, 30); // 30 second cache

    return NextResponse.json(result);
  } catch (err) {
    console.error('List conversations error:', err);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
});

/**
 * POST - Create a new conversation
 * Body: {
 *   type: 'PARENT_TEACHER' | 'TEACHER_CLASS' | 'TEACHER_TEACHER',
 *   participantUserIds: string[],   // For 1:1 or group chats
 *   classId?: number,               // For TEACHER_CLASS
 *   sectionId?: number,             // For TEACHER_CLASS
 *   title?: string,                 // Optional title
 * }
 */export const POST = withSchoolAccess(async function POST(req, { params }) {
  const { schoolId } = await params;

  const { dbUser, error } = await authenticateChatRequest(req, schoolId);
  if (error) return error;

  try {
    const body = await req.json();
    const { type, participantUserIds = [], classId, sectionId, title } = body;

    if (!type || !Object.values(CONVERSATION_TYPES).includes(type)) {
      return NextResponse.json({ error: 'Invalid conversation type' }, { status: 400 });
    }

    const roleName = dbUser.role?.name;

    // Validate permissions
    const validation = await validateConversationPermission(
      dbUser.id, schoolId, roleName, type, participantUserIds, { classId, sectionId }
    );

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 403 });
    }

    // For 1:1 chats, check if conversation already exists
    if (type !== CONVERSATION_TYPES.TEACHER_CLASS && participantUserIds.length === 1) {
      const existing = await prisma.conversation.findFirst({
        where: {
          schoolId,
          type,
          AND: [
          { participants: { some: { userId: dbUser.id, isActive: true } } },
          { participants: { some: { userId: participantUserIds[0], isActive: true } } },
          { participants: { none: { userId: { notIn: [dbUser.id, participantUserIds[0]] }, isActive: true } } }]

        },
        orderBy: [
        { lastMessageAt: 'desc' },
        { createdAt: 'desc' }],

        include: {
          participants: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true, name: true, profilePicture: true, lastSeenAt: true,
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
          }
        }
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          conversation: formatConversationForClient(existing, dbUser.id),
          existing: true
        });
      }
    }

    // Build participant list
    let allParticipantIds = [dbUser.id, ...participantUserIds];

    // For TEACHER_CLASS, auto-add students and parents from the class/section
    if (type === CONVERSATION_TYPES.TEACHER_CLASS) {
      const sectionStudents = await prisma.student.findMany({
        where: {
          schoolId,
          classId,
          ...(sectionId && { sectionId })
        },
        select: {
          userId: true,
          user: {
            select: {
              parent: {
                select: { userId: true }
              }
            }
          }
        }
      });

      for (const s of sectionStudents) {
        allParticipantIds.push(s.userId);
        if (s.user?.parent?.userId) {
          allParticipantIds.push(s.user.parent.userId);
        }
      }
    }

    // Deduplicate
    allParticipantIds = [...new Set(allParticipantIds)];

    // Create conversation with participants in a transaction
    const conversation = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          schoolId,
          type,
          title: title || null,
          classId: classId || null,
          sectionId: sectionId || null,
          createdById: dbUser.id,
          participants: {
            create: allParticipantIds.map((uid) => ({
              userId: uid,
              role: uid === dbUser.id ? 'ADMIN' : 'MEMBER'
            }))
          }
        },
        include: {
          participants: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true, name: true, profilePicture: true, lastSeenAt: true,
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

      return conv;
    });

    // Invalidate conversation list cache for all participants
    await Promise.all(
      allParticipantIds.map((uid) => invalidatePattern(`chat:conversations*${uid}*`))
    );

    return NextResponse.json({
      success: true,
      conversation: formatConversationForClient(conversation, dbUser.id),
      existing: false
    }, { status: 201 });
  } catch (err) {
    console.error('Create conversation error:', err);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
});