import prisma from '@/lib/prisma';

export async function createSchoolAccountAuditLog({
    action,
    schoolId,
    performedBy,
    metadata,
    oldData,
    newData,
    error,
}) {
    return prisma.auditLog.create({
        data: {
            userId: performedBy ?? null,
            schoolId,
            action,
            tableName: 'SchoolAccountState',
            rowId: schoolId,
            oldData: oldData ?? null,
            newData: newData ?? null,
            metadata: metadata ?? null,
            error: error ?? null,
        },
    });
}
