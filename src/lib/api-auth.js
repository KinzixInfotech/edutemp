/**
 * API Auth Utilities
 * Shared authentication helpers for API routes that need role-based access control
 * 
 * USAGE:
 * import { verifyAuth, verifyAdminAccess } from '@/lib/api-auth';
 * 
 * // In your API route:
 * const auth = await verifyAuth(request);
 * if (auth.error) return auth.response;
 * const { user, supabaseUser } = auth;
 */

import { NextResponse } from 'next/server';
import supabaseServer from '@/lib/supabase-server'; // Use singleton
import prisma from '@/lib/prisma';

/**
 * Extract and verify JWT token from request
 * Returns Supabase user if valid, error response if not
 */
export async function verifyAuth(request) {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            error: 'Unauthorized',
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        };
    }

    const token = authHeader.substring(7);

    try {
        const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

        if (authError || !user) {
            return {
                error: 'Invalid token',
                response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            };
        }

        return { supabaseUser: user };
    } catch (err) {
        console.error('Auth verification error:', err);
        return {
            error: 'Auth service unavailable',
            response: NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 })
        };
    }
}

/**
 * Verify authentication AND get full user with role from database
 * Useful when you need role information
 */
export async function verifyAuthWithRole(request) {
    const authResult = await verifyAuth(request);
    if (authResult.error) return authResult;

    try {
        const fullUser = await prisma.user.findUnique({
            where: { id: authResult.supabaseUser.id },
            include: { role: true },
        });

        if (!fullUser) {
            return {
                error: 'User not found',
                response: NextResponse.json({ error: 'User not found' }, { status: 404 })
            };
        }

        return { user: fullUser, supabaseUser: authResult.supabaseUser };
    } catch (err) {
        console.error('User lookup error:', err);
        return {
            error: 'Database error',
            response: NextResponse.json({ error: 'Database error' }, { status: 500 })
        };
    }
}

/**
 * Verify admin access (ADMIN or SUPER_ADMIN) with optional school check
 * Most common pattern in admin APIs
 */
export async function verifyAdminAccess(request, schoolId = null) {
    const authResult = await verifyAuthWithRole(request);
    if (authResult.error) return authResult;

    const { user } = authResult;
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];

    if (!allowedRoles.includes(user.role?.name)) {
        return {
            error: 'Access denied',
            response: NextResponse.json(
                { error: 'Access denied. Admin role required.' },
                { status: 403 }
            )
        };
    }

    // Check school access if schoolId provided (SUPER_ADMIN can access any school)
    if (schoolId && user.role.name !== 'SUPER_ADMIN' && user.schoolId !== schoolId) {
        return {
            error: 'School access denied',
            response: NextResponse.json(
                { error: 'Access denied to this school' },
                { status: 403 }
            )
        };
    }

    return { user, supabaseUser: authResult.supabaseUser };
}

/**
 * Verify access with custom role list
 */
export async function verifyRoleAccess(request, allowedRoles, schoolId = null) {
    const authResult = await verifyAuthWithRole(request);
    if (authResult.error) return authResult;

    const { user } = authResult;

    if (!allowedRoles.includes(user.role?.name)) {
        return {
            error: 'Access denied',
            response: NextResponse.json(
                { error: `Access denied. Required roles: ${allowedRoles.join(', ')}` },
                { status: 403 }
            )
        };
    }

    // SUPER_ADMIN bypasses school check
    if (schoolId && user.role.name !== 'SUPER_ADMIN' && user.schoolId !== schoolId) {
        return {
            error: 'School access denied',
            response: NextResponse.json(
                { error: 'Access denied to this school' },
                { status: 403 }
            )
        };
    }

    return { user, supabaseUser: authResult.supabaseUser };
}
