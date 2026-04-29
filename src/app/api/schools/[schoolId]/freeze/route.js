import { NextResponse } from 'next/server';
import { verifyRoleAccess } from '@/lib/api-auth';
import { freezeSchoolAccount, unfreezeSchoolAccount } from '@/lib/school-account-service';
import { FREEZE_TYPE, SCHOOL_STATUS, getSchoolAccountState } from '@/lib/school-account-state';
import { invalidatePattern } from '@/lib/cache';

export async function PATCH(request, props) {
    const auth = await verifyRoleAccess(request, ['SUPER_ADMIN']);
    if (auth.error) {
        return auth.response;
    }

    const params = await props.params;
    const schoolId = params.schoolId;

    try {
        const current = await getSchoolAccountState(schoolId);
        if (!current) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        let school;
        let message;

        if (current.status === SCHOOL_STATUS.ACTIVE) {
            school = await freezeSchoolAccount({
                schoolId,
                type: FREEZE_TYPE.HARD,
                reason: 'Legacy freeze action from school manage screen',
                performedBy: auth.user.id,
            });
            message = `School "${school.name}" has been hard frozen and suspended.`;
        } else {
            school = await unfreezeSchoolAccount({
                schoolId,
                performedBy: auth.user.id,
            });
            message = `School "${school.name}" is active again.`;
        }

        await invalidatePattern('schools:*');
        await invalidatePattern(`school:*:${schoolId}*`);

        return NextResponse.json({
            success: true,
            school,
            message,
        });
    } catch (error) {
        console.error('[SCHOOL_FREEZE_LEGACY]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update school status' },
            { status: 500 },
        );
    }
}
