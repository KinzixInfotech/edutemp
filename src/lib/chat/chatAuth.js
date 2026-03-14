// ============================================
// CHAT AUTH - Centralized authentication for chat routes
// ============================================

import { supabaseServer } from '@/lib/supabase-server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Authenticate a chat API request.
 * Extracts the Supabase JWT from the Authorization header,
 * validates it, and verifies the user belongs to the given school.
 *
 * @param {Request} req - The incoming request
 * @param {string} schoolId - The schoolId from the route params
 * @returns {{ user, dbUser, error }} - user = Supabase auth user, dbUser = Prisma User row
 */
export async function authenticateChatRequest(req, schoolId) {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                user: null,
                dbUser: null,
                error: NextResponse.json(
                    { error: 'Missing or invalid authorization header' },
                    { status: 401 }
                ),
            };
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

        if (authError || !user) {
            return {
                user: null,
                dbUser: null,
                error: NextResponse.json(
                    { error: 'Invalid or expired token' },
                    { status: 401 }
                ),
            };
        }

        // Fetch user from DB and verify school membership
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                schoolId: true,
                name: true,
                email: true,
                profilePicture: true,
                status: true,
                roleId: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!dbUser) {
            return {
                user: null,
                dbUser: null,
                error: NextResponse.json(
                    { error: 'User not found' },
                    { status: 404 }
                ),
            };
        }

        if (dbUser.status !== 'ACTIVE') {
            return {
                user: null,
                dbUser: null,
                error: NextResponse.json(
                    { error: 'User account is not active' },
                    { status: 403 }
                ),
            };
        }

        // Verify user belongs to the school (Admins with MASTER_ADMIN can access any school)
        if (dbUser.schoolId !== schoolId && dbUser.role?.name !== 'MASTER_ADMIN') {
            return {
                user: null,
                dbUser: null,
                error: NextResponse.json(
                    { error: 'You do not belong to this school' },
                    { status: 403 }
                ),
            };
        }

        return { user, dbUser, error: null };
    } catch (err) {
        console.error('Chat auth error:', err);
        return {
            user: null,
            dbUser: null,
            error: NextResponse.json(
                { error: 'Authentication failed' },
                { status: 500 }
            ),
        };
    }
}

/**
 * Verify that a user is a participant of a conversation.
 * @param {string} conversationId
 * @param {string} userId
 * @returns {object|null} - The participant record, or null if not found
 */
export async function verifyConversationParticipant(conversationId, userId) {
    return prisma.conversationParticipant.findUnique({
        where: {
            conversationId_userId: {
                conversationId,
                userId,
            },
        },
    });
}

/**
 * Check if a user has admin role (ADMIN, MASTER_ADMIN, PRINCIPAL, DIRECTOR)
 */
export function isAdminRole(roleName) {
    return ['ADMIN', 'MASTER_ADMIN', 'PRINCIPAL', 'DIRECTOR'].includes(roleName);
}
