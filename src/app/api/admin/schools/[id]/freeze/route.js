import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyRoleAccess } from '@/lib/api-auth';
import { freezeSchoolAccount } from '@/lib/school-account-service';
import { invalidatePattern } from '@/lib/cache';

const freezeSchema = z.object({
    type: z.enum(['SOFT', 'HARD']),
    reason: z.string().trim().min(3, 'Reason is required'),
    freezeUntil: z.string().datetime().optional().nullable(),
});

export async function POST(request, props) {
    const auth = await verifyRoleAccess(request, ['SUPER_ADMIN']);
    if (auth.error) {
        return auth.response;
    }

    try {
        const params = await props.params;
        const payload = freezeSchema.parse(await request.json());

        const school = await freezeSchoolAccount({
            schoolId: params.id,
            type: payload.type,
            reason: payload.reason,
            performedBy: auth.user.id,
            freezeUntil: payload.freezeUntil ? new Date(payload.freezeUntil) : null,
        });

        await invalidatePattern('schools:*');
        await invalidatePattern(`school:*:${params.id}*`);

        return NextResponse.json({
            success: true,
            school,
            message: payload.type === 'HARD'
                ? `School "${school.name}" has been hard frozen and suspended.`
                : `School "${school.name}" has been soft frozen and marked past due.`,
        });
    } catch (error) {
        console.error('[ADMIN_SCHOOL_FREEZE]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to freeze school' },
            { status: 500 },
        );
    }
}
