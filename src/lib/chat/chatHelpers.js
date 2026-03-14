// ============================================
// CHAT HELPERS - Shared utility functions
// ============================================

import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { RATE_LIMITS, CONVERSATION_TYPES, MAX_MESSAGE_LENGTH } from './chatConstants';

// ============================================
// PERMISSION VALIDATION
// ============================================

/**
 * Validate that a user is allowed to create a conversation of the given type
 * with the given participants.
 *
 * @param {string} userId - The creator's user ID
 * @param {string} schoolId - The school context
 * @param {string} roleName - Creator's role name
 * @param {string} conversationType - PARENT_TEACHER | TEACHER_CLASS | TEACHER_TEACHER | DIRECT
 * @param {string[]} participantUserIds - Target user IDs (excluding creator)
 * @param {{ classId?: number, sectionId?: number }} classContext - For TEACHER_CLASS type
 * @returns {{ valid: boolean, error?: string }}
 */
export async function validateConversationPermission(
    userId, schoolId, roleName, conversationType, participantUserIds, classContext = {}
) {
    switch (conversationType) {
        case CONVERSATION_TYPES.PARENT_TEACHER:
            return validateParentTeacherPermission(userId, schoolId, roleName, participantUserIds);

        case CONVERSATION_TYPES.TEACHER_CLASS:
            return validateTeacherClassPermission(userId, schoolId, roleName, classContext);

        case CONVERSATION_TYPES.TEACHER_TEACHER:
            return validateTeacherTeacherPermission(userId, schoolId, roleName, participantUserIds);

        case CONVERSATION_TYPES.DIRECT:
            return { valid: true }; // Basic 1:1 always allowed for now within school

        case CONVERSATION_TYPES.COMMUNITY:
            return validateCommunityPermission(userId, schoolId, roleName, participantUserIds);

        default:
            return { valid: false, error: 'Invalid conversation type' };
    }
}

/**
 * PARENT_TEACHER: Parent can only message teachers of their child's class/section.
 * Teacher can message parents of students in their class/section.
 */
async function validateParentTeacherPermission(userId, schoolId, roleName, participantUserIds) {
    if (roleName === 'PARENT') {
        // Get parent's children's section teachers
        const parent = await prisma.parent.findUnique({
            where: { userId },
            select: {
                students: {
                    select: {
                        student: {
                            select: {
                                sectionId: true,
                                section: {
                                    select: {
                                        subjectTeachers: {
                                            select: { teachingStaffUserId: true },
                                        },
                                        teachingStaffUserId: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!parent) return { valid: false, error: 'Parent record not found' };

        // Collect all eligible teacher user IDs
        const eligibleTeacherIds = new Set();
        for (const link of parent.students) {
            const student = link.student;
            if (student?.section) {
                // Class teacher
                if (student.section.teachingStaffUserId) {
                    eligibleTeacherIds.add(student.section.teachingStaffUserId);
                }
                // Subject teachers
                for (const st of student.section.subjectTeachers) {
                    eligibleTeacherIds.add(st.teachingStaffUserId);
                }
            }
        }

        // Convert teacher staff IDs to user IDs
        const teachers = await prisma.teachingStaff.findMany({
            where: { userId: { in: Array.from(eligibleTeacherIds) } },
            select: { userId: true },
        });
        const teacherUserIds = new Set(teachers.map(t => t.userId));

        // Verify all participants are eligible teachers
        for (const pid of participantUserIds) {
            if (!teacherUserIds.has(pid)) {
                return { valid: false, error: 'You can only message teachers of your child\'s class' };
            }
        }

        return { valid: true };
    }

    if (roleName === 'TEACHING_STAFF') {
        // Teacher can message any parent of students in their sections
        // Verify the target is actually a parent
        const targetUsers = await prisma.user.findMany({
            where: { id: { in: participantUserIds }, schoolId },
            select: { id: true, role: { select: { name: true } } },
        });

        for (const u of targetUsers) {
            if (u.role.name !== 'PARENT') {
                return { valid: false, error: 'PARENT_TEACHER conversations must include a parent and a teacher' };
            }
        }

        return { valid: true };
    }

    return { valid: false, error: 'Only parents and teachers can create PARENT_TEACHER conversations' };
}

/**
 * TEACHER_CLASS: Only a teacher who teaches the class/section can broadcast.
 */
async function validateTeacherClassPermission(userId, schoolId, roleName, classContext) {
    if (roleName !== 'TEACHING_STAFF') {
        return { valid: false, error: 'Only teachers can create class broadcasts' };
    }

    const { classId, sectionId } = classContext;
    if (!classId) {
        return { valid: false, error: 'classId is required for class broadcasts' };
    }

    // Check if teacher teaches this class/section
    const whereClause = {
        teachingStaffUserId: userId,
        section: {
            classId,
            ...(sectionId && { id: sectionId }),
            class: { schoolId },
        },
    };

    const assignment = await prisma.sectionSubjectTeacher.findFirst({
        where: whereClause,
    });

    // Also check if they're the class teacher or section supervisor
    const sectionSupervisor = await prisma.section.findFirst({
        where: {
            teachingStaffUserId: userId,
            classId,
            ...(sectionId && { id: sectionId }),
        },
    });

    const classTeacher = await prisma.class.findFirst({
        where: {
            id: classId,
            teachingStaffUserId: userId,
            schoolId,
        },
    });

    const isAssigned = !!assignment || !!sectionSupervisor || !!classTeacher;
    return { valid: isAssigned, error: isAssigned ? undefined : 'You are not assigned to this class/section' };
}

/**
 * COMMUNITY: Anyone can create a group for now.
 */
async function validateCommunityPermission(userId, schoolId, roleName, participantUserIds) {
    if (participantUserIds.length < 1) {
        return { valid: false, error: 'Community groups must have at least one other participant' };
    }
    // Logic for restricting who can create communities can be added here
    return { valid: true };
}

/**
 * TEACHER_TEACHER: Both users must be teaching staff in the same school.
 */
async function validateTeacherTeacherPermission(userId, schoolId, roleName, participantUserIds) {
    if (roleName !== 'TEACHING_STAFF') {
        return { valid: false, error: 'Only teaching staff can create teacher-teacher conversations' };
    }

    const targetUsers = await prisma.user.findMany({
        where: { id: { in: participantUserIds }, schoolId },
        select: { id: true, role: { select: { name: true } } },
    });

    if (targetUsers.length !== participantUserIds.length) {
        return { valid: false, error: 'One or more users not found in this school' };
    }

    for (const u of targetUsers) {
        if (u.role.name !== 'TEACHING_STAFF') {
            return { valid: false, error: 'All participants must be teaching staff' };
        }
    }

    return { valid: true };
}

// ============================================
// ELIGIBLE USERS
// ============================================

/**
 * Get users that the current user is eligible to message.
 */
export async function getEligibleUsers(userId, schoolId, roleName) {
    const eligibleUsers = [];

    // Fetch existing direct conversations to prevent duplicates
    const existingConvs = await prisma.conversationParticipant.findMany({
        where: {
            userId,
            isActive: true,
            conversation: {
                type: { in: ['DIRECT', 'PARENT_TEACHER', 'TEACHER_TEACHER'] }
            }
        },
        include: {
            conversation: {
                include: {
                    participants: {
                        where: { userId: { not: userId }, isActive: true },
                        select: { userId: true }
                    }
                }
            }
        }
    });

    const convMap = new Map();
    for (const p of existingConvs) {
        const otherParticipant = p.conversation.participants[0];
        if (otherParticipant) {
            convMap.set(otherParticipant.userId, p.conversationId);
        }
    }

    if (roleName === 'PARENT') {
        // Parents can message their children's teachers
        const parent = await prisma.parent.findUnique({
            where: { userId },
            select: {
                studentLinks: {
                    select: {
                        student: {
                            select: {
                                sectionId: true,
                                classId: true,
                                section: {
                                    select: {
                                        subjectTeachers: {
                                            select: {
                                                teacher: {
                                                    select: {
                                                        user: {
                                                            select: {
                                                                id: true,
                                                                name: true,
                                                                profilePicture: true,
                                                                role: { select: { name: true } },
                                                                teacher: {
                                                                    select: {
                                                                        Class: { select: { className: true } },
                                                                        sectionsAssigned: { select: { name: true, class: { select: { className: true } } } }
                                                                    }
                                                                }
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        teachingStaff: {
                                            select: {
                                                user: {
                                                    select: {
                                                        id: true,
                                                        name: true,
                                                        profilePicture: true,
                                                        role: { select: { name: true } },
                                                        teacher: {
                                                            select: {
                                                                Class: { select: { className: true } },
                                                                sectionsAssigned: { select: { name: true, class: { select: { className: true } } } },
                                                                SectionSubjectTeacher: {
                                                                    select: {
                                                                        section: {
                                                                            select: {
                                                                                name: true,
                                                                                class: { select: { className: true } }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (parent) {
            const seen = new Set();
            for (const link of parent.studentLinks) {
                const section = link.student?.section;
                if (!section) continue;

                // Section supervisor
                if (section.teachingStaff?.user && !seen.has(section.teachingStaff.user.id)) {
                    seen.add(section.teachingStaff.user.id);
                    eligibleUsers.push({
                        ...section.teachingStaff.user,
                        conversationType: 'PARENT_TEACHER',
                        existingConversationId: convMap.get(section.teachingStaff.user.id),
                    });
                }

                // Subject teachers
                for (const st of section.subjectTeachers) {
                    if (st.teacher?.user && !seen.has(st.teacher.user.id)) {
                        seen.add(st.teacher.user.id);
                        eligibleUsers.push({
                            ...st.teacher.user,
                            conversationType: 'PARENT_TEACHER',
                            existingConversationId: convMap.get(st.teacher.user.id),
                        });
                    }
                }
            }
        }
    }

    if (roleName === 'TEACHING_STAFF') {
        // Teachers can message: other teachers + parents of their students
        const [otherTeachers, teacherSections] = await Promise.all([
            // Other teaching staff in same school
            prisma.user.findMany({
                where: {
                    schoolId,
                    role: { name: 'TEACHING_STAFF' },
                    id: { not: userId },
                    status: 'ACTIVE',
                },
                select: {
                    id: true,
                    name: true,
                    profilePicture: true,
                    role: { select: { name: true } },
                    teacher: {
                        select: {
                            Class: { select: { className: true } },
                            sectionsAssigned: { select: { name: true, class: { select: { className: true } } } },
                            SectionSubjectTeacher: {
                                select: {
                                    section: {
                                        select: {
                                            name: true,
                                            class: { select: { className: true } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
            }),
            // Sections this teacher teaches
            prisma.sectionSubjectTeacher.findMany({
                where: { teachingStaffUserId: userId },
                select: {
                    section: {
                        select: {
                            id: true,
                            name: true,
                            classId: true,
                            class: { select: { id: true, className: true } },
                            students: {                          // ← was "studentParentLinks"
                                select: {
                                    studentParentLinks: {        // ← go through Student
                                        where: { isActive: true },
                                        select: {
                                            parent: {
                                                select: {
                                                    user: {
                                                        select: {
                                                            id: true,
                                                            name: true,
                                                            profilePicture: true,
                                                            role: { select: { name: true } },
                                                            parent: {
                                                                select: {
                                                                    studentLinks: {
                                                                        select: {
                                                                            student: {
                                                                                select: {
                                                                                    user: { select: { name: true } },
                                                                                    class: { select: { className: true } },
                                                                                    section: { select: { name: true } },
                                                                                },
                                                                            },
                                                                        },
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
        ]);

        // Add other teachers
        for (const t of otherTeachers) {
            eligibleUsers.push({
                ...t,
                conversationType: 'TEACHER_TEACHER',
                existingConversationId: convMap.get(t.id),
            });
        }

        // Add parents from their sections
        // Add parents from their sections
        const seenParents = new Set();
        for (const entry of teacherSections) {
            // ← now iterate section.students, then each student's studentParentLinks
            if (!entry.section?.students) continue;
            for (const student of entry.section.students) {
                for (const link of student.studentParentLinks) {
                    const parentUser = link.parent?.user;
                    if (parentUser && !seenParents.has(parentUser.id)) {
                        seenParents.add(parentUser.id);
                        eligibleUsers.push({
                            ...parentUser,
                            conversationType: 'PARENT_TEACHER',
                            existingConversationId: convMap.get(parentUser.id),
                        });
                    }
                }
            }
        }
    }

    if (roleName === 'STUDENT') {
        // Students can message teachers of their class/section
        const student = await prisma.student.findUnique({
            where: { userId },
            select: {
                section: {
                    select: {
                        subjectTeachers: {
                            select: {
                                teacher: {
                                    select: {
                                        user: {
                                            select: {
                                                id: true,
                                                name: true,
                                                profilePicture: true,
                                                role: { select: { name: true } },
                                                teacher: {
                                                    select: {
                                                        Class: { select: { className: true } },
                                                        sectionsAssigned: { select: { name: true, class: { select: { className: true } } } },
                                                        SectionSubjectTeacher: {
                                                            select: {
                                                                section: {
                                                                    select: {
                                                                        name: true,
                                                                        class: { select: { className: true } }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        teachingStaff: {
                            select: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        profilePicture: true,
                                        role: { select: { name: true } },
                                        teacher: {
                                            select: {
                                                Class: { select: { className: true } },
                                                sectionsAssigned: { select: { name: true, class: { select: { className: true } } } },
                                                SectionSubjectTeacher: {
                                                    select: {
                                                        section: {
                                                            select: {
                                                                name: true,
                                                                class: { select: { className: true } }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (student?.section) {
            const seen = new Set();
            if (student.section.teachingStaff?.user) {
                seen.add(student.section.teachingStaff.user.id);
                eligibleUsers.push({
                    ...student.section.teachingStaff.user,
                    conversationType: 'DIRECT',
                    existingConversationId: convMap.get(student.section.teachingStaff.user.id),
                });
            }
            for (const st of student.section.subjectTeachers) {
                if (st.teacher?.user && !seen.has(st.teacher.user.id)) {
                    seen.add(st.teacher.user.id);
                    eligibleUsers.push({
                        ...st.teacher.user,
                        conversationType: 'DIRECT',
                        existingConversationId: convMap.get(st.teacher.user.id),
                    });
                }
            }
        }
    }

    return eligibleUsers;
}

// ============================================
// RATE LIMITING
// ============================================

/**
 * Check if user has exceeded the message rate limit.
 * Uses Redis with a sliding window counter.
 * @returns {{ allowed: boolean, remaining: number }}
 */
export async function checkMessageRateLimit(userId) {
    try {
        const key = `chat:ratelimit:msg:${userId}`;
        const current = await redis.get(key);
        const count = parseInt(current || '0', 10);

        if (count >= RATE_LIMITS.MESSAGES_PER_MINUTE) {
            return { allowed: false, remaining: 0 };
        }

        // Increment and set TTL of 60 seconds if new key
        const pipeline = redis.pipeline();
        pipeline.incr(key);
        if (!current) {
            pipeline.expire(key, 60);
        }
        await pipeline.exec();

        return { allowed: true, remaining: RATE_LIMITS.MESSAGES_PER_MINUTE - count - 1 };
    } catch (err) {
        // If Redis fails, allow the message (fail open)
        console.warn('Rate limit check failed, allowing message:', err.message);
        return { allowed: true, remaining: RATE_LIMITS.MESSAGES_PER_MINUTE };
    }
}

// ============================================
// MESSAGE SANITIZATION
// ============================================

/**
 * Sanitize message content to prevent XSS.
 * Strips HTML tags and trims content.
 */
export function sanitizeMessageContent(content) {
    if (!content || typeof content !== 'string') return '';

    // Strip all HTML tags
    let clean = content.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    clean = clean
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/');

    // Re-strip in case decoded content created tags
    clean = clean.replace(/<[^>]*>/g, '');

    // Trim and limit length
    clean = clean.trim().slice(0, MAX_MESSAGE_LENGTH);

    return clean;
}

// ============================================
// FORMATTING
// ============================================

/**
 * Format a conversation for client display.
 * Adds display name, unread count, etc.
 */
export function formatConversationForClient(conversation, currentUserId) {
    const otherParticipants = conversation.participants?.filter(
        p => p.userId !== currentUserId && p.isActive
    ) || [];

    // Current user's participant record
    const myParticipant = conversation.participants?.find(
        p => p.userId === currentUserId
    );

    // Generate display name
    let displayName = conversation.title;
    if (!displayName) {
        if (conversation.type === 'TEACHER_CLASS') {
            displayName = conversation.title || `Class Chat`;
        } else {
            displayName = otherParticipants
                .map(p => p.user?.name || 'Unknown')
                .join(', ') || 'Chat';
        }
    }

    // Calculate unread count
    const lastReadAt = myParticipant?.lastReadAt;
    const unreadCount = lastReadAt
        ? (conversation._count?.messages || 0) // Will be populated by query
        : (conversation.messages?.length || 0);

    // Check mute status
    const isMuted = myParticipant?.mutedUntil
        ? new Date(myParticipant.mutedUntil) > new Date()
        : false;

    return {
        id: conversation.id,
        type: conversation.type,
        title: displayName,
        classId: conversation.classId,
        sectionId: conversation.sectionId,
        lastMessageAt: conversation.lastMessageAt,
        lastMessageText: conversation.lastMessageText,
        createdAt: conversation.createdAt,
        isMuted,
        mutedUntil: myParticipant?.mutedUntil,
        unreadCount,
        participants: otherParticipants.map(p => ({
            id: p.userId,
            name: p.user?.name,
            profilePicture: p.user?.profilePicture,
            role: p.user?.role?.name,
        })),
    };
}
