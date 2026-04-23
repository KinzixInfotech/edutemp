import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyRoleAccess } from '@/lib/api-auth';

function getPagination(searchParams) {
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '10')));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export async function GET(request) {
  const auth = await verifyRoleAccess(request, ['SUPER_ADMIN']);
  if (auth.error) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPagination(searchParams);

    const search = String(searchParams.get('search') || '').trim();
    const status = String(searchParams.get('status') || 'all');
    const emailStatus = String(searchParams.get('emailStatus') || 'all');

    const where = {
      ...(status !== 'all' ? { status } : {}),
      ...(emailStatus !== 'all' ? { emailStatus } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { schoolName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [items, total, totalCount, newCount, contactedCount, todayCount, mailedCount] =
      await Promise.all([
        prisma.contactSubmission.findMany({
          where,
          orderBy: { submittedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.contactSubmission.count({ where }),
        prisma.contactSubmission.count(),
        prisma.contactSubmission.count({ where: { status: 'NEW' } }),
        prisma.contactSubmission.count({ where: { status: 'CONTACTED' } }),
        prisma.contactSubmission.count({
          where: { submittedAt: { gte: todayStart } },
        }),
        prisma.contactSubmission.count({ where: { emailStatus: 'SENT' } }),
      ]);

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary: {
        total: totalCount,
        new: newCount,
        contacted: contactedCount,
        today: todayCount,
        mailed: mailedCount,
      },
    });
  } catch (error) {
    console.error('[SUPER ADMIN CONTACT SUBMISSIONS][GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact submissions.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const auth = await verifyRoleAccess(request, ['SUPER_ADMIN']);
  if (auth.error) return auth.response;

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    const status = String(body.status || '').trim();
    const adminNotes = typeof body.adminNotes === 'string' ? body.adminNotes.trim() : undefined;

    if (!id) {
      return NextResponse.json({ error: 'Submission id is required.' }, { status: 400 });
    }

    const allowedStatuses = ['NEW', 'IN_PROGRESS', 'CONTACTED', 'RESOLVED', 'SPAM'];
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    const updated = await prisma.contactSubmission.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(adminNotes !== undefined ? { adminNotes } : {}),
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error('[SUPER ADMIN CONTACT SUBMISSIONS][PATCH]', error);
    return NextResponse.json(
      { error: 'Failed to update contact submission.' },
      { status: 500 }
    );
  }
}
