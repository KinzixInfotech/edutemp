import { NextResponse } from 'next/server';
import { verifyRoleAccess } from '@/lib/api-auth';
import { deleteSchoolCascade } from '@/lib/school-delete';

export async function DELETE(request, props) {
    const params = await props.params;
    const { schoolId } = params;

    const auth = await verifyRoleAccess(request, ['SUPER_ADMIN']);
    if (auth.error) {
        return auth.response;
    }

    try {
        const result = await deleteSchoolCascade(schoolId);

        return NextResponse.json({
            success: true,
            message: `School "${result.school.name}" and all associated data deleted successfully.`,
            deletedUsers: result.deletedUsers,
        });
    } catch (error) {
        console.error('[SCHOOL_DELETE_CASCADE]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete school' },
            { status: 500 },
        );
    }
}
