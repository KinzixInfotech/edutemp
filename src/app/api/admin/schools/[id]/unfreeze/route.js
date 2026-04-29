import { NextResponse } from 'next/server';
import { verifyRoleAccess } from '@/lib/api-auth';
import { unfreezeSchoolAccount } from '@/lib/school-account-service';
import { invalidatePattern } from '@/lib/cache';

export async function POST(request, props) {
    const auth = await verifyRoleAccess(request, ['SUPER_ADMIN']);
    if (auth.error) {
        return auth.response;
    }

    try {
        const params = await props.params;
        const school = await unfreezeSchoolAccount({
            schoolId: params.id,
            performedBy: auth.user.id,
        });

        await invalidatePattern('schools:*');
        await invalidatePattern(`school:*:${params.id}*`);

        return NextResponse.json({
            success: true,
            school,
            message: `School "${school.name}" is active again.`,
        });
    } catch (error) {
        console.error('[ADMIN_SCHOOL_UNFREEZE]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to unfreeze school' },
            { status: 500 },
        );
    }
}
