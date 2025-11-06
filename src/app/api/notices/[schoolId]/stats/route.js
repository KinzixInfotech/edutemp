// File: app/api/notices/[schoolId]/stats/route.js
// GET - Get notice statistics for dashboard

export async function GET(request, { params }) {
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        const stats = {
            total: await prisma.notice.count({ where: { schoolId } }),
            published: await prisma.notice.count({
                where: { schoolId, status: 'PUBLISHED' }
            }),
            draft: await prisma.notice.count({
                where: { schoolId, status: 'DRAFT' }
            }),
            urgent: await prisma.notice.count({
                where: { schoolId, priority: 'URGENT', status: 'PUBLISHED' }
            }),
        };

        if (userId) {
            // Get unread count for user
            const unreadCount = await prisma.notice.count({
                where: {
                    schoolId,
                    status: 'PUBLISHED',
                    NOT: {
                        NoticeReads: {
                            some: { userId }
                        }
                    }
                }
            });

            stats.unread = unreadCount;
        }

        return NextResponse.json(stats);

    } catch (error) {
        console.error('Error fetching notice stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats', message: error.message },
            { status: 500 }
        );
    }
}