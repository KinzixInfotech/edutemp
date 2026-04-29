import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyRoleAccess } from '@/lib/api-auth';
import { markSchoolTerminated } from '@/lib/school-account-service';
import { invalidatePattern } from '@/lib/cache';
import qstash from '@/lib/qstash';

const terminateSchema = z.object({
    reason: z.string().trim().min(3, 'Reason is required'),
});

export async function POST(request, props) {
    const auth = await verifyRoleAccess(request, ['SUPER_ADMIN']);
    if (auth.error) {
        return auth.response;
    }

    try {
        const params = await props.params;
        const payload = terminateSchema.parse(await request.json());

        const school = await markSchoolTerminated({
            schoolId: params.id,
            performedBy: auth.user.id,
            reason: payload.reason,
        });

        const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.edubreezy.com';
        const workerUrl = `${baseUrl}/api/admin/schools/cleanup-worker`;

        if (process.env.NODE_ENV === 'development') {
            fetch(workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-internal-key': process.env.INTERNAL_API_KEY || 'edubreezy_internal',
                },
                body: JSON.stringify({
                    schoolId: params.id,
                    reason: payload.reason,
                    performedBy: auth.user.id,
                }),
            }).catch((error) => console.error('[SCHOOL_TERMINATE_ENQUEUE]', error));
        } else {
            await qstash.publishJSON({
                url: workerUrl,
                retries: 3,
                body: {
                    schoolId: params.id,
                    reason: payload.reason,
                    performedBy: auth.user.id,
                },
            });
        }

        await invalidatePattern('schools:*');
        await invalidatePattern(`school:*:${params.id}*`);

        return NextResponse.json({
            success: true,
            school,
            message: `School "${school.name}" has been terminated. Cleanup has been queued.`,
        });
    } catch (error) {
        console.error('[ADMIN_SCHOOL_TERMINATE]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to terminate school' },
            { status: 500 },
        );
    }
}
