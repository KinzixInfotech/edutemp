// / File: app/api / notices / [schoolId] / [noticeId] / route.js
// GET - Fetch single notice
// PUT - Update notice
// DELETE - Delete notice'

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, props) {
    const params = await props.params;
    try {
        const { schoolId, noticeId } = params;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        const notice = await prisma.notice.findFirst({
            where: {
                id: noticeId,
                schoolId,
            },
            include: {
                Author: {
                    select: { 
                        name: true,
                        email: true,
                    }
                },
                NoticeTarget: {
                    include: {
                        Class: { select: { className: true } },
                        Section: { select: { name: true } },
                    }
                },
                NoticeReads: userId ? {
                    where: { userId },
                    select: { readAt: true }
                } : false,
                _count: {
                    select: { NoticeReads: true }
                }
            }
        });

        if (!notice) {
            return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
        }

        return NextResponse.json(notice);

    } catch (error) {
        console.error('Error fetching notice:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notice', message: error.message },
            { status: 500 }
        );
    }
}

export async function PUT(request, props) {
    const params = await props.params;
    try {
        const { schoolId, noticeId } = params;
        const body = await request.json();

        const {
            title,
            description,
            subtitle,
            category,
            audience,
            priority,
            status,
            fileUrl,
            attachments,
            issuedBy,
            issuerRole,
            importantDates,
            publishedAt,
            expiryDate,
            targets,
        } = body;

        // Update notice
        const notice = await prisma.notice.update({
            where: { id: noticeId },
            data: {
                title,
                description,
                subtitle,
                category,
                audience,
                priority,
                status,
                fileUrl,
                attachments,
                issuedBy,
                issuerRole,
                importantDates,
                publishedAt: publishedAt ? new Date(publishedAt) : undefined,
                expiryDate: expiryDate ? new Date(expiryDate) : undefined,
            },
            include: {
                Author: {
                    select: {
                        name: true,
                        email: true,
                    }
                },
                NoticeTarget: true,
            }
        });

        // Update targets if provided
        if (targets) {
            // Delete existing targets
            await prisma.noticeTarget.deleteMany({
                where: { noticeId }
            });

            // Create new targets
            await prisma.noticeTarget.createMany({
                data: targets.map(target => ({
                    noticeId,
                    classId: target.classId,
                    sectionId: target.sectionId,
                    roleId: target.roleId,
                    userId: target.userId,
                }))
            });
        }

        return NextResponse.json(notice);

    } catch (error) {
        console.error('Error updating notice:', error);
        return NextResponse.json(
            { error: 'Failed to update notice', message: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request, props) {
    const params = await props.params;
    try {
        const { noticeId } = params;

        await prisma.notice.delete({
            where: { id: noticeId }
        });

        return NextResponse.json({ message: 'Notice deleted successfully' });

    } catch (error) {
        console.error('Error deleting notice:', error);
        return NextResponse.json(
            { error: 'Failed to delete notice', message: error.message },
            { status: 500 }
        );
    }
}

// File: app/api/notices/[schoolId]/[noticeId]/mark-read/route.js
// POST - Mark notice as read

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { noticeId } = params;
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Check if already read
        const existing = await prisma.noticeRead.findUnique({
            where: {
                noticeId_userId: {
                    noticeId,
                    userId,
                }
            }
        });

        if (existing) {
            return NextResponse.json({ message: 'Already marked as read' });
        }

        // Mark as read
        const noticeRead = await prisma.noticeRead.create({
            data: {
                noticeId,
                userId,
            }
        });

        // Increment view count
        await prisma.notice.update({
            where: { id: noticeId },
            data: {
                viewCount: {
                    increment: 1
                }
            }
        });

        return NextResponse.json(noticeRead, { status: 201 });

    } catch (error) {
        console.error('Error marking notice as read:', error);
        return NextResponse.json(
            { error: 'Failed to mark notice as read', message: error.message },
            { status: 500 }
        );
    }
}
