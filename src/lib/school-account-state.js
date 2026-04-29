import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const SCHOOL_ACCOUNT_ERROR_CODES = {
    PAST_DUE_WRITE_BLOCKED: 'SCHOOL_PAST_DUE_WRITE_BLOCKED',
    SUSPENDED: 'SCHOOL_SUSPENDED',
    TERMINATED: 'SCHOOL_TERMINATED',
};

export const SCHOOL_STATUS = {
    ACTIVE: 'ACTIVE',
    PAST_DUE: 'PAST_DUE',
    SUSPENDED: 'SUSPENDED',
    TERMINATED: 'TERMINATED',
};

export const FREEZE_TYPE = {
    SOFT: 'SOFT',
    HARD: 'HARD',
};

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function isWriteMethod(method) {
    return WRITE_METHODS.has(String(method || '').toUpperCase());
}

export async function getSchoolAccountState(schoolId) {
    if (!schoolId) {
        return null;
    }

    return prisma.school.findUnique({
        where: { id: schoolId },
        select: {
            id: true,
            name: true,
            status: true,
            freezeType: true,
            freezeReason: true,
            freezeStartedAt: true,
            freezeUntil: true,
            deletedAt: true,
        },
    });
}

export async function resolveSchoolIdForUser(user) {
    if (!user) {
        return null;
    }

    if (user.schoolId) {
        return user.schoolId;
    }

    switch (user.role?.name) {
        case 'ADMIN':
            return (await prisma.admin.findUnique({ where: { userId: user.id }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'TEACHING_STAFF':
            return (await prisma.teachingStaff.findUnique({ where: { userId: user.id }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'NON_TEACHING_STAFF':
            return (await prisma.nonTeachingStaff.findUnique({ where: { userId: user.id }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'STUDENT':
            return (await prisma.student.findUnique({ where: { userId: user.id }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'PARENT':
            return (await prisma.parent.findUnique({ where: { userId: user.id }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'LIBRARIAN':
            return (await prisma.librarian.findUnique({ where: { userId: user.id }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'ACCOUNTANT':
            return (await prisma.accountant.findUnique({ where: { userId: user.id }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'DIRECTOR':
            return (await prisma.director.findUnique({ where: { userId: user.id }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'PRINCIPAL':
            return (await prisma.principal.findUnique({ where: { userId: user.id }, select: { schoolId: true } }))?.schoolId ?? null;
        case 'DRIVER':
        case 'CONDUCTOR':
            return (await prisma.transportStaff.findUnique({ where: { userId: user.id }, select: { schoolId: true } }))?.schoolId ?? null;
        default:
            return null;
    }
}

export function buildSchoolAccessErrorResponse(status, school) {
    if (status === SCHOOL_STATUS.TERMINATED) {
        return NextResponse.json({
            error: 'Account no longer exists',
            code: SCHOOL_ACCOUNT_ERROR_CODES.TERMINATED,
            schoolStatus: status,
            schoolId: school?.id ?? null,
        }, { status: 410 });
    }

    if (status === SCHOOL_STATUS.SUSPENDED) {
        return NextResponse.json({
            error: 'Account suspended',
            code: SCHOOL_ACCOUNT_ERROR_CODES.SUSPENDED,
            schoolStatus: status,
            schoolId: school?.id ?? null,
            freezeType: school?.freezeType ?? null,
            freezeReason: school?.freezeReason ?? null,
        }, { status: 423 });
    }

    return NextResponse.json({
        error: 'Subscription expired',
        code: SCHOOL_ACCOUNT_ERROR_CODES.PAST_DUE_WRITE_BLOCKED,
        schoolStatus: SCHOOL_STATUS.PAST_DUE,
        schoolId: school?.id ?? null,
        freezeType: school?.freezeType ?? null,
        freezeReason: school?.freezeReason ?? null,
    }, { status: 402 });
}

export async function enforceSchoolStateAccess({
    schoolId,
    method,
    bypass = false,
    allowPastDueWrite = false,
}) {
    if (bypass || !schoolId) {
        return { ok: true, school: null };
    }

    const school = await getSchoolAccountState(schoolId);

    if (!school) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'School not found' }, { status: 404 }),
        };
    }

    if (school.status === SCHOOL_STATUS.TERMINATED) {
        console.warn('[SCHOOL_ACCESS_BLOCKED]', { schoolId, status: school.status, method });
        return { ok: false, school, response: buildSchoolAccessErrorResponse(SCHOOL_STATUS.TERMINATED, school) };
    }

    if (school.status === SCHOOL_STATUS.SUSPENDED) {
        console.warn('[SCHOOL_ACCESS_BLOCKED]', { schoolId, status: school.status, method });
        return { ok: false, school, response: buildSchoolAccessErrorResponse(SCHOOL_STATUS.SUSPENDED, school) };
    }

    if (school.status === SCHOOL_STATUS.PAST_DUE && isWriteMethod(method) && !allowPastDueWrite) {
        console.warn('[SCHOOL_ACCESS_BLOCKED]', { schoolId, status: school.status, method });
        return { ok: false, school, response: buildSchoolAccessErrorResponse(SCHOOL_STATUS.PAST_DUE, school) };
    }

    return { ok: true, school };
}

export async function getSchoolAccessSnapshotForUser(user, method, options = {}) {
    const schoolId = options.schoolId ?? await resolveSchoolIdForUser(user);
    const bypass = options.bypass === true || user?.role?.name === 'SUPER_ADMIN';
    const access = await enforceSchoolStateAccess({
        schoolId,
        method,
        bypass,
        allowPastDueWrite: options.allowPastDueWrite === true,
    });

    return {
        ...access,
        schoolId,
        bypass,
    };
}
