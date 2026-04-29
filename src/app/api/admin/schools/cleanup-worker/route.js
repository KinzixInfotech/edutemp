import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { deleteSchoolCascade } from '@/lib/school-delete';
import { createSchoolAccountAuditLog } from '@/lib/school-account-audit';

async function handler(request) {
    try {
        if (process.env.NODE_ENV === 'development') {
            const internalKey = request.headers.get('x-internal-key');
            if (internalKey !== (process.env.INTERNAL_API_KEY || 'edubreezy_internal')) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const body = await request.json();
        const { schoolId, performedBy, reason } = body;

        if (!schoolId) {
            return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
        }

        const result = await deleteSchoolCascade(schoolId);

        await createSchoolAccountAuditLog({
            action: 'SCHOOL_STATUS_AUTOMATED',
            schoolId,
            performedBy: performedBy ?? null,
            metadata: {
                source: 'termination-cleanup-worker',
                reason,
                deletedUsers: result.deletedUsers,
            },
        });

        return NextResponse.json({
            success: true,
            schoolId,
            deletedUsers: result.deletedUsers,
        });
    } catch (error) {
        console.error('[SCHOOL_CLEANUP_WORKER]', error);
        return NextResponse.json(
            { error: error.message || 'Cleanup failed' },
            { status: 500 },
        );
    }
}

export const POST = process.env.NODE_ENV === 'development'
    ? handler
    : verifySignatureAppRouter(handler);
