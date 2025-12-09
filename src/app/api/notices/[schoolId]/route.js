// File: app/api/notices/[schoolId]/route.js
// GET - Fetch all notices (with filters for mobile & web)
// POST - Create new notice
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { messaging } from '@/lib/firebase-admin';
import { remember, generateKey, invalidatePattern } from '@/lib/cache';

export async function GET(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(request.url);

        // Filters
        const category = searchParams.get('category');
        const status = searchParams.get('status') || 'PUBLISHED';
        const priority = searchParams.get('priority');
        const userId = searchParams.get('userId');
        const limit = parseInt(searchParams.get('limit') || '50');
        const page = parseInt(searchParams.get('page') || '1');
        const skip = (page - 1) * limit;

        const where = {
            schoolId,
            status,
            ...(category && category !== 'All' && { category }),
            ...(priority && { priority }),
        };

        // Generate cache key based on all query params
        const cacheKey = generateKey('notices:list', {
            schoolId,
            category,
            status,
            priority,
            userId,
            limit,
            page
        });

        const result = await remember(cacheKey, async () => {

            let notices;
            let totalCount;

            if (userId) {
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    include: {
                        role: true,
                        student: {
                            include: {
                                class: true,
                                section: true,
                            }
                        },
                        teacher: true,
                    }
                });

                if (!user) {
                    return NextResponse.json({ error: 'User not found' }, { status: 404 });
                }

                const audienceFilter = {
                    OR: [
                        { audience: 'ALL' },
                        { audience: user.role.name === 'STUDENT' ? 'STUDENTS' : 'TEACHERS' },
                    ]
                };

                if (user.student) {
                    audienceFilter.OR.push(
                        {
                            AND: [
                                { audience: 'CLASS' },
                                {
                                    NoticeTarget: {
                                        some: {
                                            classId: user.student.classId
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            AND: [
                                { audience: 'SECTION' },
                                {
                                    NoticeTarget: {
                                        some: {
                                            sectionId: user.student.sectionId
                                        }
                                    }
                                }
                            ]
                        }
                    );
                }

                where.AND = [audienceFilter];

                notices = await prisma.notice.findMany({
                    where,
                    include: {
                        Author: {
                            select: {
                                name: true,
                                email: true,
                            }
                        },
                        NoticeReads: {
                            where: { userId },
                            select: { readAt: true }
                        },
                        _count: {
                            select: { NoticeReads: true }
                        }
                    },
                    orderBy: [
                        { publishedAt: 'desc' }
                    ],
                    take: limit,
                    skip,
                });

                totalCount = await prisma.notice.count({ where });

                notices = notices.map(notice => ({
                    id: notice.id,
                    title: notice.title,
                    subtitle: notice.subtitle || notice.description.substring(0, 100),
                    description: notice.description,
                    category: notice.category,
                    priority: notice.priority,
                    publishedAt: notice.publishedAt,
                    expiryDate: notice.expiryDate,
                    fileUrl: notice.fileUrl,
                    attachments: notice.attachments,
                    issuedBy: notice.issuedBy || notice.Author?.name,
                    issuerRole: notice.issuerRole,
                    importantDates: notice.importantDates,
                    read: notice.NoticeReads.length > 0,
                    readAt: notice.NoticeReads[0]?.readAt,
                    viewCount: notice._count.NoticeReads,
                    createdAt: notice.createdAt,
                }));

            } else {
                notices = await prisma.notice.findMany({
                    where,
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
                        _count: {
                            select: { NoticeReads: true }
                        }
                    },
                    orderBy: [
                        { priority: 'desc' },
                        { publishedAt: 'desc' }
                    ],
                    take: limit,
                    skip,
                });

                totalCount = await prisma.notice.count({ where });
            }

            return {
                notices,
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit),
                }
            };
        }, 120); // Cache for 2 minutes

        return NextResponse.json(result);

    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch notices', message: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await request.json();

        const {
            title,
            description,
            subtitle,
            category,
            audience,
            priority = 'NORMAL',
            status = 'DRAFT',
            fileUrl,
            attachments,
            issuedBy,
            issuerRole,
            importantDates,
            publishedAt,
            expiryDate,
            createdById,
            targets = [],
        } = body;

        if (!title || !description) {
            return NextResponse.json(
                { error: 'Title and description are required' },
                { status: 400 }
            );
        }

        const notice = await prisma.notice.create({
            data: {
                schoolId,
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
                publishedAt: publishedAt ? new Date(publishedAt) : (status === 'PUBLISHED' ? new Date() : null),
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                createdById,
                NoticeTarget: {
                    create: targets.map(target => ({
                        classId: target.classId,
                        sectionId: target.sectionId,
                        roleId: target.roleId,
                        userId: target.userId,
                    }))
                }
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
                }
            }
        });

        if (status === 'PUBLISHED') {
            const targetUsers = await getTargetUsers(schoolId, audience, targets);
            await sendPushNotifications(targetUsers, notice);
        }

        return NextResponse.json(notice, { status: 201 });

    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create notice', message: error.message },
            { status: 500 }
        );
    }
}

async function getTargetUsers(schoolId, audience, targets) {
    const where = { schoolId };

    if (audience === 'ALL') {
    } else if (audience === 'STUDENTS') {
        where.role = { name: 'STUDENT' };
    } else if (audience === 'TEACHERS') {
        where.role = { name: 'TEACHER' };
    } else if (audience === 'CLASS') {
        const classIds = targets.map(t => t.classId).filter(Boolean);
        where.student = { classId: { in: classIds } };
    } else if (audience === 'SECTION') {
        const sectionIds = targets.map(t => t.sectionId).filter(Boolean);
        where.student = { sectionId: { in: sectionIds } };
    }

    const users = await prisma.user.findMany({
        where,
        select: {
            id: true,
            name: true,
            fcmToken: true,
        }
    });

    return users;
}

async function sendPushNotifications(users, notice) {
    const tokens = users
        .map(u => u.fcmToken)
        .filter(Boolean);

    if (tokens.length === 0) {
        return;
    }

    const message = {
        notification: {
            title: notice.title,
            body: notice.subtitle || notice.description.substring(0, 100) + '-' + 'TAP TO VIEW ',
        },
        data: {
            type: 'NEW_NOTICE',
            noticeId: notice.id.toString(),
            category: notice.category,
            priority: notice.priority,
        },
        tokens: tokens,
    };

    try {
        const response = await messaging.sendEachForMulticast(message);

        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });

            await prisma.user.updateMany({
                where: { fcmToken: { in: failedTokens } },
                data: { fcmToken: null }
            });
        }
    } catch (error) { }
}
