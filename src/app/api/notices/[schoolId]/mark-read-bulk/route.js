import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const POST = withSchoolAccess(async function POST(request, props) {
  const params = await props.params;
  try {
    const { schoolId } = params;
    const body = await request.json();
    const { userId, noticeIds } = body;

    if (!schoolId || typeof schoolId !== 'string') {
      return NextResponse.json({ error: 'Invalid school ID' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    if (!Array.isArray(noticeIds) || noticeIds.length === 0) {
      return NextResponse.json({ error: 'noticeIds must be a non-empty array' }, { status: 400 });
    }

    const uniqueNoticeIds = [...new Set(noticeIds.filter((id) => typeof id === 'string' && id.trim()))];

    if (!uniqueNoticeIds.length) {
      return NextResponse.json({ error: 'No valid notice IDs provided' }, { status: 400 });
    }

    const notices = await prisma.notice.findMany({
      where: {
        id: { in: uniqueNoticeIds },
        schoolId
      },
      select: { id: true }
    });

    const foundNoticeIds = notices.map((notice) => notice.id);
    const missingNoticeIds = uniqueNoticeIds.filter((id) => !foundNoticeIds.includes(id));

    if (!foundNoticeIds.length) {
      return NextResponse.json({ error: 'No matching notices found' }, { status: 404 });
    }

    const existingReads = await prisma.noticeRead.findMany({
      where: {
        userId,
        noticeId: { in: foundNoticeIds }
      },
      select: { noticeId: true }
    });

    const alreadyReadIds = new Set(existingReads.map((entry) => entry.noticeId));
    const unreadNoticeIds = foundNoticeIds.filter((id) => !alreadyReadIds.has(id));

    if (unreadNoticeIds.length) {
      await prisma.$transaction([
      prisma.noticeRead.createMany({
        data: unreadNoticeIds.map((noticeId) => ({ noticeId, userId })),
        skipDuplicates: true
      }),
      ...unreadNoticeIds.map((noticeId) =>
      prisma.notice.update({
        where: { id: noticeId },
        data: {
          viewCount: { increment: 1 }
        }
      })
      )]
      );
    }

    return NextResponse.json({
      message: unreadNoticeIds.length ?
      'Notices marked as read successfully' :
      'All notices were already marked as read',
      processedCount: foundNoticeIds.length,
      createdCount: unreadNoticeIds.length,
      alreadyReadCount: foundNoticeIds.length - unreadNoticeIds.length,
      markedNoticeIds: unreadNoticeIds,
      alreadyReadIds: foundNoticeIds.filter((id) => alreadyReadIds.has(id)),
      missingNoticeIds
    }, { status: unreadNoticeIds.length ? 201 : 200 });
  } catch (error) {
    console.error('Error marking notices as read in bulk:', error);
    return NextResponse.json(
      {
        error: 'Failed to mark notices as read',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
});