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
import { getSchoolAccessSnapshotForUser } from '@/lib/school-account-state';

async function resolveSchoolIdByLookup(kind, value) {
    if (!value) {
        return null;
    }

    switch (kind) {
        case 'userId':
            return (await prisma.user.findUnique({ where: { id: value }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'studentId': {
            const student = await prisma.student.findFirst({
                where: {
                    OR: [{ id: value }, { userId: value }],
                },
                select: { schoolId: true },
            });
            return student?.schoolId ?? null;
        }
        case 'formId':
            return (await prisma.form.findUnique({ where: { id: value }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'examId':
            return (await prisma.exam.findUnique({ where: { id: value }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'receiptId':
            return (await prisma.receipt.findUnique({ where: { id: value }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'paymentId':
            return (await prisma.feePayment.findUnique({ where: { id: value }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'orderId':
            return (await prisma.feePayment.findFirst({ where: { gatewayOrderId: value }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'homeworkId':
            return (await prisma.homework.findUnique({ where: { id: value }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'signatureId':
            return (await prisma.signature.findUnique({ where: { id: value }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'academicYearId':
            return (await prisma.academicYear.findUnique({ where: { id: value }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'applicationId':
            return (await prisma.application.findUnique({ where: { id: value }, select: { schoolId: true } }))?.schoolId ?? null;
        default:
            return null;
    }
}

async function getSchoolIdFromRequest(request, params = null) {
    let pathname = '';
    let searchParams = null;

    try {
        const url = new URL(request.url);
        pathname = url.pathname;
        searchParams = url.searchParams;
        const schoolIdFromQuery = searchParams.get('schoolId');
        if (schoolIdFromQuery) {
            return schoolIdFromQuery;
        }
    } catch {
        // ignore URL parsing failures
    }

    const contentType = request.headers.get('content-type') || '';

    try {
        let body = null;

        if (contentType.includes('application/json')) {
            body = await request.clone().json();
        } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
            const formData = await request.clone().formData();
            body = Object.fromEntries(formData.entries());
        }

        if (body?.schoolId) {
            return body.schoolId;
        }

        const directLookups = [
            ['userId', body?.userId ?? request.headers.get('x-user-id')],
            ['studentId', body?.studentId],
            ['formId', body?.formId],
            ['examId', body?.examId],
            ['receiptId', body?.receiptId],
            ['paymentId', body?.paymentId],
            ['orderId', body?.orderId ?? body?.RefNo ?? body?.MerchantRefNo],
            ['homeworkId', body?.homeworkId],
        ];

        for (const [kind, value] of directLookups) {
            const schoolId = await resolveSchoolIdByLookup(kind, value);
            if (schoolId) {
                return schoolId;
            }
        }

        const paramLookups = [
            ['userId', params?.userId],
            ['studentId', params?.studentId],
            ['formId', params?.formId],
            ['examId', params?.examId],
            ['receiptId', params?.receiptId],
            ['paymentId', params?.paymentId],
            ['orderId', params?.orderId],
            ['homeworkId', params?.homeworkId],
        ];

        for (const [kind, value] of paramLookups) {
            const schoolId = await resolveSchoolIdByLookup(kind, value);
            if (schoolId) {
                return schoolId;
            }
        }

        if (pathname.includes('/documents/signatures/manage/') && params?.id) {
            return resolveSchoolIdByLookup('signatureId', params.id);
        }

        if (pathname.includes('/schools/academic-years/') && params?.id) {
            return resolveSchoolIdByLookup('academicYearId', params.id);
        }

        if (pathname.includes('/schools/admissions/applications/') && params?.id) {
            return resolveSchoolIdByLookup('applicationId', params.id);
        }

        return null;
    } catch {
        if (searchParams?.get('userId')) {
            return resolveSchoolIdByLookup('userId', searchParams.get('userId'));
        }
        if (request.headers.get('x-user-id')) {
            return resolveSchoolIdByLookup('userId', request.headers.get('x-user-id'));
        }
        if (params?.userId) {
            return resolveSchoolIdByLookup('userId', params.userId);
        }
        if (params?.studentId) {
            return resolveSchoolIdByLookup('studentId', params.studentId);
        }
        if (params?.formId) {
            return resolveSchoolIdByLookup('formId', params.formId);
        }
        if (params?.examId) {
            return resolveSchoolIdByLookup('examId', params.examId);
        }
        if (params?.receiptId) {
            return resolveSchoolIdByLookup('receiptId', params.receiptId);
        }
        if (params?.paymentId) {
            return resolveSchoolIdByLookup('paymentId', params.paymentId);
        }
        if (params?.orderId) {
            return resolveSchoolIdByLookup('orderId', params.orderId);
        }
        if (params?.homeworkId) {
            return resolveSchoolIdByLookup('homeworkId', params.homeworkId);
        }
        if (pathname.includes('/documents/signatures/manage/') && params?.id) {
            return resolveSchoolIdByLookup('signatureId', params.id);
        }
        if (pathname.includes('/schools/academic-years/') && params?.id) {
            return resolveSchoolIdByLookup('academicYearId', params.id);
        }
        if (pathname.includes('/schools/admissions/applications/') && params?.id) {
            return resolveSchoolIdByLookup('applicationId', params.id);
        }
        return null;
    }
}

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

        const schoolAccess = await getSchoolAccessSnapshotForUser(fullUser, request.method);
        if (!schoolAccess.ok) {
            return {
                error: 'School access blocked',
                response: schoolAccess.response,
            };
        }

        return {
            user: fullUser,
            supabaseUser: authResult.supabaseUser,
            schoolAccess,
        };
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

    const schoolAccess = await getSchoolAccessSnapshotForUser(user, request.method, { schoolId });
    if (!schoolAccess.ok) {
        return {
            error: 'School access blocked',
            response: schoolAccess.response,
        };
    }

    return { user, supabaseUser: authResult.supabaseUser, schoolAccess };
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

    const schoolAccess = await getSchoolAccessSnapshotForUser(user, request.method, { schoolId });
    if (!schoolAccess.ok) {
        return {
            error: 'School access blocked',
            response: schoolAccess.response,
        };
    }

    return { user, supabaseUser: authResult.supabaseUser, schoolAccess };
}

export function withSchoolAccess(handler, options = {}) {
    return async function schoolAccessWrappedHandler(request, context = {}) {
        const params = await context?.params;
        const resolvedSchoolId = options.getSchoolId
            ? await options.getSchoolId({ request, context, params })
            : params?.schoolId ?? await getSchoolIdFromRequest(request, params);

        const schoolAccess = await getSchoolAccessSnapshotForUser(
            options.user ?? null,
            options.method ?? request.method,
            {
                schoolId: resolvedSchoolId,
                bypass: options.bypass === true,
                allowPastDueWrite: options.allowPastDueWrite === true,
            }
        );

        if (!schoolAccess.ok) {
            return schoolAccess.response;
        }

        return handler(request, { ...context, params }, {
            schoolAccess,
            schoolId: resolvedSchoolId,
            params,
        });
    };
}
