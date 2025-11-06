// File: app/api/notices/[schoolId]/route.js
// GET - Fetch all notices (with filters for mobile & web)
// POST - Create new notice
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { messaging } from '@/lib/firebase-admin';

export async function GET(request, { params }) {
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(request.url);

        // Filters
        const category = searchParams.get('category');
        const status = searchParams.get('status') || 'PUBLISHED';
        const priority = searchParams.get('priority');
        const userId = searchParams.get('userId'); // For mobile - get user-specific notices
        const limit = parseInt(searchParams.get('limit') || '50');
        const page = parseInt(searchParams.get('page') || '1');
        const skip = (page - 1) * limit;

        console.log('GET /notices DEBUG - schoolId:', schoolId, 'userId:', userId, 'limit:', limit, 'page:', page);

        // Build where clause
        const where = {
            schoolId,
            status,
            ...(category && category !== 'All' && { category }),
            ...(priority && { priority }),
        };

        // If userId provided (mobile app), filter by audience and read status
        let notices;
        let totalCount;

        if (userId) {
            console.log('GET DEBUG - Mobile user request, fetching user:', userId);
            // Mobile app request - get user-specific notices
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
                console.log('GET DEBUG - User not found:', userId);
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            console.log('GET DEBUG - User found:', { id: user.id, role: user.role.name, hasStudent: !!user.student });

            // Build audience filter
            const audienceFilter = {
                OR: [
                    { audience: 'ALL' },
                    { audience: user.role.name === 'STUDENT' ? 'STUDENTS' : 'TEACHERS' },
                ]
            };

            // Add class/section filters for students
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

            console.log('GET DEBUG - Final where clause:', JSON.stringify(where, null, 2));

            // Fetch notices with read status
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
                    // { priority: 'desc' },
                    { publishedAt: 'desc' }
                ],
                take: limit,
                skip,
            });

            totalCount = await prisma.notice.count({ where });

            console.log(`GET DEBUG - Fetched ${notices.length} notices for user ${userId}, totalCount: ${totalCount}`);

            // Format for mobile
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
            console.log('GET DEBUG - Web admin request, no userId');
            // Web admin request - get all notices
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
            console.log(`GET DEBUG - Fetched ${notices.length} notices (admin), totalCount: ${totalCount}`);
        }

        return NextResponse.json({
            notices,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            }
        });

    } catch (error) {
        console.error('Error fetching notices:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notices', message: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request, { params }) {
    try {
        const { schoolId } = params;
        const body = await request.json();

        console.log('POST /notices DEBUG - Received body:', JSON.stringify(body, null, 2));

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
            targets = [], // [{ classId?, sectionId?, roleId?, userId? }]
        } = body;

        // Validation
        if (!title || !description) {
            console.log('POST DEBUG - Validation failed: title or description missing');
            return NextResponse.json(
                { error: 'Title and description are required' },
                { status: 400 }
            );
        }

        console.log('POST DEBUG - Creating notice with status:', status, 'audience:', audience, 'targets:', targets);

        // Create notice with targets
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

        console.log('POST DEBUG - Notice created:', { id: notice.id, title: notice.title, status: notice.status });

        // If published, send real-time updates and push notifications
        if (status === 'PUBLISHED') {
            console.log('POST DEBUG - Notice is PUBLISHED, FCM');

            // 1. Get target users based on audience
            const targetUsers = await getTargetUsers(schoolId, audience, targets);
            console.log(`POST DEBUG - Found ${targetUsers.length} target users for FCM`);

            // 2. Send real-time event via Pusher
            // const pusherPayload = {
            //     notice: {
            //         id: notice.id,
            //         title: notice.title,
            //         subtitle: notice.subtitle || notice.description.substring(0, 100),
            //         category: notice.category,
            //         priority: notice.priority,
            //         publishedAt: notice.publishedAt?.toISOString(),
            //     }
            // };

            // console.log('POST DEBUG - PUSHER TRIGGERING:', {
            //     channel: `school-${schoolId}`,
            //     event: 'new-notice',
            //     payload: pusherPayload
            // });

            // try {
            //     await pusher.trigger(`school-${schoolId}`, 'new-notice', pusherPayload);
            //     console.log('POST DEBUG - PUSHER SUCCESS');
            // } catch (pusherError) {
            //     console.error('POST DEBUG - PUSHER FAILED:', pusherError);
            // }

            // 2. Send FCM push notifications (background only)
            await sendPushNotifications(targetUsers, notice);
        } else {
            console.log('POST DEBUG - Notice is DRAFT, skipping Pusher & FCM');
        }

        return NextResponse.json(notice, { status: 201 });

    } catch (error) {
        console.error('Error creating notice:', error);
        return NextResponse.json(
            { error: 'Failed to create notice', message: error.message },
            { status: 500 }
        );
    }
}

// Helper: Get target users
async function getTargetUsers(schoolId, audience, targets) {
    console.log('FCM DEBUG - getTargetUsers called with audience:', audience, 'targets:', targets);

    const where = { schoolId };

    if (audience === 'ALL') {
        console.log('FCM DEBUG - Audience: ALL');
    } else if (audience === 'STUDENTS') {
        where.role = { name: 'STUDENT' };
        console.log('FCM DEBUG - Audience: STUDENTS');
    } else if (audience === 'TEACHERS') {
        where.role = { name: 'TEACHER' };
        console.log('FCM DEBUG - Audience: TEACHERS');
    } else if (audience === 'CLASS') {
        const classIds = targets.map(t => t.classId).filter(Boolean);
        where.student = { classId: { in: classIds } };
        console.log('FCM DEBUG - Audience: CLASS, classIds:', classIds);
    } else if (audience === 'SECTION') {
        const sectionIds = targets.map(t => t.sectionId).filter(Boolean);
        where.student = { sectionId: { in: sectionIds } };
        console.log('FCM DEBUG - Audience: SECTION, sectionIds:', sectionIds);
    }

    console.log('FCM DEBUG - Final where clause:', JSON.stringify(where, null, 2));

    const users = await prisma.user.findMany({
        where,
        select: {
            id: true,
            name: true,
            fcmToken: true,
        }
    });

    const validTokens = users.filter(u => u.fcmToken).length;
    console.log(`FCM DEBUG - Found ${users.length} users, ${validTokens} have FCM tokens`);

    return users;
}

// Helper: Send push notifications
async function sendPushNotifications(users, notice) {
    const tokens = users
        .map(u => u.fcmToken)
        .filter(Boolean);

    console.log(`FCM DEBUG - Preparing to send to ${tokens.length} tokens`);

    if (tokens.length === 0) {
        console.log('FCM DEBUG - No valid FCM tokens, skipping send');
        return;
    }

    const message = {
        notification: {
            title: notice.title,
            body: notice.subtitle || notice.description.substring(0, 100),
        },
        data: {
            type: 'NEW_NOTICE',
           noticeId: notice.id.toString(),  // always string
            category: notice.category,
            priority: notice.priority,
        },
        tokens: tokens,
    };

    console.log('FCM DEBUG - FCM message payload:', JSON.stringify(message, null, 2));

    try {
        const response = await messaging.sendEachForMulticast(message);
        console.log(`FCM DEBUG - FCM SUCCESS: ${response.successCount} sent, ${response.failureCount} failed`);

        // Handle failed tokens
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                    console.log(`FCM DEBUG - Failed token ${idx}:`, resp.error?.message);
                }
            });
            console.log('FCM DEBUG - Cleaning up failed tokens:', failedTokens);

            await prisma.user.updateMany({
                where: { fcmToken: { in: failedTokens } },
                data: { fcmToken: null }
            });
            console.log('FCM DEBUG - Removed failed tokens from DB');
        }
    } catch (error) {
        console.error('FCM DEBUG - FCM SEND ERROR:', error);
    }
}