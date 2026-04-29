import prisma from '@/lib/prisma';
import { FREEZE_TYPE, SCHOOL_STATUS } from '@/lib/school-account-state';
import { createSchoolAccountAuditLog } from '@/lib/school-account-audit';
import { notifySchoolAccountStatusChange } from '@/lib/notifications/notificationHelper';

export async function freezeSchoolAccount({
    schoolId,
    type,
    reason,
    performedBy,
    freezeUntil = null,
}) {
    const current = await prisma.school.findUnique({
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

    if (!current) {
        throw new Error('School not found');
    }

    const nextStatus = type === FREEZE_TYPE.HARD ? SCHOOL_STATUS.SUSPENDED : SCHOOL_STATUS.PAST_DUE;

    const updated = await prisma.school.update({
        where: { id: schoolId },
        data: {
            status: nextStatus,
            freezeType: type,
            freezeReason: reason,
            freezeStartedAt: new Date(),
            freezeUntil,
        },
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

    await createSchoolAccountAuditLog({
        action: 'SCHOOL_FREEZE',
        schoolId,
        performedBy,
        oldData: current,
        newData: updated,
        metadata: {
            reason,
            freezeType: type,
            source: 'admin',
        },
    });

    try {
        await notifySchoolAccountStatusChange({
            schoolId,
            schoolName: updated.name,
            status: updated.status,
            freezeType: updated.freezeType,
            reason,
        });
    } catch (error) {
        console.error('[SCHOOL_FREEZE_NOTIFY_FAILED]', error);
    }

    return updated;
}

export async function unfreezeSchoolAccount({
    schoolId,
    performedBy,
}) {
    const current = await prisma.school.findUnique({
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

    if (!current) {
        throw new Error('School not found');
    }

    const updated = await prisma.school.update({
        where: { id: schoolId },
        data: {
            status: SCHOOL_STATUS.ACTIVE,
            freezeType: null,
            freezeReason: null,
            freezeStartedAt: null,
            freezeUntil: null,
        },
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

    await createSchoolAccountAuditLog({
        action: 'SCHOOL_UNFREEZE',
        schoolId,
        performedBy,
        oldData: current,
        newData: updated,
        metadata: {
            source: 'admin',
        },
    });

    try {
        await notifySchoolAccountStatusChange({
            schoolId,
            schoolName: updated.name,
            status: updated.status,
            freezeType: null,
            reason: null,
        });
    } catch (error) {
        console.error('[SCHOOL_UNFREEZE_NOTIFY_FAILED]', error);
    }

    return updated;
}

export async function markSchoolTerminated({
    schoolId,
    performedBy,
    reason,
}) {
    const current = await prisma.school.findUnique({
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

    if (!current) {
        throw new Error('School not found');
    }

    const updated = await prisma.school.update({
        where: { id: schoolId },
        data: {
            status: SCHOOL_STATUS.TERMINATED,
            freezeType: FREEZE_TYPE.HARD,
            freezeReason: reason,
            freezeStartedAt: current.freezeStartedAt ?? new Date(),
            deletedAt: new Date(),
        },
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

    await createSchoolAccountAuditLog({
        action: 'SCHOOL_TERMINATE',
        schoolId,
        performedBy,
        oldData: current,
        newData: updated,
        metadata: {
            source: 'admin',
            reason,
        },
    });

    try {
        await notifySchoolAccountStatusChange({
            schoolId,
            schoolName: updated.name,
            status: updated.status,
            freezeType: updated.freezeType,
            reason,
        });
    } catch (error) {
        console.error('[SCHOOL_TERMINATE_NOTIFY_FAILED]', error);
    }

    return updated;
}

export async function applyAutomatedSchoolStatus({
    schoolId,
    status,
    reason,
    freezeType,
}) {
    const current = await prisma.school.findUnique({
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

    if (!current) {
        throw new Error('School not found');
    }

    if (current.status === SCHOOL_STATUS.TERMINATED) {
        return current;
    }

    const updated = await prisma.school.update({
        where: { id: schoolId },
        data: {
            status,
            freezeType: status === SCHOOL_STATUS.ACTIVE ? null : (freezeType ?? current.freezeType ?? null),
            freezeReason: status === SCHOOL_STATUS.ACTIVE ? null : reason,
            freezeStartedAt: status === SCHOOL_STATUS.ACTIVE ? null : (current.freezeStartedAt ?? new Date()),
            freezeUntil: null,
        },
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

    if (current.status !== updated.status || current.freezeReason !== updated.freezeReason || current.freezeType !== updated.freezeType) {
        await createSchoolAccountAuditLog({
            action: 'SCHOOL_STATUS_AUTOMATED',
            schoolId,
            performedBy: null,
            oldData: current,
            newData: updated,
            metadata: {
                source: 'billing-cron',
                reason,
            },
        });

        try {
            await notifySchoolAccountStatusChange({
                schoolId,
                schoolName: updated.name,
                status: updated.status,
                freezeType: updated.freezeType,
                reason,
            });
        } catch (error) {
            console.error('[SCHOOL_AUTOMATED_STATUS_NOTIFY_FAILED]', error);
        }
    }

    return updated;
}
