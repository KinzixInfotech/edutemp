// app/api/notices/[schoolId]/[noticeId]/mark-read/route.js

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { noticeId } = params;
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        if (!noticeId || typeof noticeId !== 'string') {
            return NextResponse.json({ error: 'Invalid notice ID' }, { status: 400 });
        }

        // 1. Verify notice exists
        const notice = await prisma.notice.findUnique({
            where: { id: noticeId },
            select: { id: true }
        });

        if (!notice) {
            return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
        }

        // 2. Check if already read
        const existing = await prisma.noticeRead.findUnique({
            where: {
                noticeId_userId: {
                    noticeId,
                    userId,
                }
            }
        });

        if (existing) {
            return NextResponse.json({ message: 'Already marked as read' }, { status: 200 });
        }

        // 3. Create read record
        const noticeRead = await prisma.noticeRead.create({
            data: {
                noticeId,
                userId,
            }
        });

        // 4. Increment view count
        await prisma.notice.update({
            where: { id: noticeId },
            data: {
                viewCount: { increment: 1 }
            }
        });

        return NextResponse.json(noticeRead, { status: 201 });

    } catch (error) {
        console.error('Error marking notice as read:', error);
        return NextResponse.json(
            { 
                error: 'Failed to mark notice as read', 
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}
