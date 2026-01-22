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
        const status = searchParams.get('status'); // Don't default to PUBLISHED - allow all
        const priority = searchParams.get('priority');
        const userId = searchParams.get('userId');
        const creatorId = searchParams.get('creatorId'); // Filter by notice creator (for admin manage page)
        const limit = parseInt(searchParams.get('limit') || '50');
        const page = parseInt(searchParams.get('page') || '1');
        const skip = (page - 1) * limit;
        const unread = searchParams.get('unread') === 'true';

        // Valid category enum values
        const validCategories = ['GENERAL', 'ACADEMIC', 'EXAM', 'EMERGENCY', 'EVENT', 'HOLIDAY', 'FEE', 'TRANSPORT'];
        const isValidCategory = category && validCategories.includes(category);

        const where = {
            schoolId,
            ...(status && { status }), // Only filter by status if provided
            ...(isValidCategory && { category }), // Only apply if valid category
            ...(priority && { priority }),
            ...(creatorId && { createdById: creatorId }), // Filter by creator
            ...(unread && userId && { // Unread filter: no read record for this user
                NoticeReads: {
                    none: {
                        userId: userId
                    }
                }
            }),
        };

        // Generate cache key based on all query params
        const cacheKey = generateKey('notices:list', {
            schoolId,
            category,
            status,
            priority,
            userId,
            creatorId,
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

                where.AND = [
                    audienceFilter,
                    // Exclude notices created by this user (they see their own in "Sent" tab)
                    { NOT: { createdById: userId } }
                ];

                notices = await prisma.notice.findMany({
                    where,
                    include: {
                        Author: {
                            select: {
                                name: true,
                                email: true,
                                profilePicture: true,
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
                    authorName: notice.Author?.name,
                    authorProfilePic: notice.Author?.profilePicture,
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
                                profilePicture: true,
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
            // Exclude the notice creator from receiving push notification
            const usersExcludingSender = targetUsers.filter(u => u.id !== createdById);
            console.log(`[Notice Push] Excluded sender (${createdById}) from push notifications`);
            console.log(`[Notice Push] Notice fileUrl: ${notice.fileUrl || 'NO IMAGE'}`);
            await sendPushNotifications(usersExcludingSender, notice);
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
    console.log(`[Notice Push] Getting target users for audience: ${audience}, schoolId: ${schoolId}`);

    let users = [];

    if (audience === 'ALL') {
        // Get all users in the school
        users = await prisma.user.findMany({
            where: { schoolId, status: 'ACTIVE' },
            select: { id: true, name: true, fcmToken: true }
        });
    } else if (audience === 'STUDENTS') {
        // Get all students
        users = await prisma.user.findMany({
            where: {
                schoolId,
                status: 'ACTIVE',
                role: { name: 'STUDENT' }
            },
            select: { id: true, name: true, fcmToken: true }
        });
    } else if (audience === 'TEACHERS') {
        // Get all teaching staff - role is TEACHING_STAFF not TEACHER
        users = await prisma.user.findMany({
            where: {
                schoolId,
                status: 'ACTIVE',
                role: { name: 'TEACHING_STAFF' }
            },
            select: { id: true, name: true, fcmToken: true }
        });
    } else if (audience === 'PARENTS') {
        // Get all parents
        users = await prisma.user.findMany({
            where: {
                schoolId,
                status: 'ACTIVE',
                role: { name: 'PARENT' }
            },
            select: { id: true, name: true, fcmToken: true }
        });
    } else if (audience === 'STAFF') {
        // Get all staff (teaching + non-teaching)
        users = await prisma.user.findMany({
            where: {
                schoolId,
                status: 'ACTIVE',
                role: { name: { in: ['TEACHING_STAFF', 'NON_TEACHING_STAFF'] } }
            },
            select: { id: true, name: true, fcmToken: true }
        });
    } else if (audience === 'CLASS') {
        // Get students in specific classes
        const classIds = targets.map(t => t.classId).filter(Boolean);
        const students = await prisma.student.findMany({
            where: { schoolId, classId: { in: classIds } },
            select: {
                user: {
                    select: { id: true, name: true, fcmToken: true }
                }
            }
        });
        users = students.map(s => s.user);
    } else if (audience === 'SECTION') {
        // Get students in specific sections
        const sectionIds = targets.map(t => t.sectionId).filter(Boolean);
        const students = await prisma.student.findMany({
            where: { schoolId, sectionId: { in: sectionIds } },
            select: {
                user: {
                    select: { id: true, name: true, fcmToken: true }
                }
            }
        });
        users = students.map(s => s.user);
    }

    const usersWithTokens = users.filter(u => u.fcmToken);
    console.log(`[Notice Push] Found ${users.length} target users, ${usersWithTokens.length} have FCM tokens`);
    if (usersWithTokens.length > 0) {
        console.log(`[Notice Push] Users with FCM tokens:`, usersWithTokens.map(u => ({ id: u.id, name: u.name })));
    }
    return users;
}

async function sendPushNotifications(users, notice) {
    const tokens = users
        .map(u => u.fcmToken)
        .filter(Boolean);

    if (tokens.length === 0) {
        console.log('[Notice Push] No FCM tokens found, skipping push notification');
        return;
    }

    console.log(`[Notice Push] Sending push to ${tokens.length} devices for notice: "${notice.title}"${notice.fileUrl ? ' (with image)' : ''}`);

    // Build notification payload with optional image
    const notificationPayload = {
        title: notice.title,
        body: notice.subtitle || notice.description.substring(0, 100) + ' - TAP TO VIEW',
    };

    // Add image if notice has one (use 'image' for FCM standard field)
    if (notice.fileUrl) {
        notificationPayload.image = notice.fileUrl; // Standard FCM field for notification image
    }

    const message = {
        notification: notificationPayload,
        data: {
            type: 'NEW_NOTICE',
            noticeId: notice.id.toString(),
            category: notice.category,
            priority: notice.priority,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            ...(notice.fileUrl && { imageUrl: notice.fileUrl }), // Also include in data for React Native apps
        },
        android: {
            notification: {
                channelId: 'default',
                priority: 'high',
                ...(notice.fileUrl && { image: notice.fileUrl }), // Android Big Picture style (use 'image' not 'imageUrl')
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                    contentAvailable: true,
                    'mutable-content': 1, // Required for iOS to display images (must be hyphenated and value 1)
                },
            },
            ...(notice.fileUrl && {
                fcm_options: {
                    image: notice.fileUrl, // iOS image support
                },
            }),
        },
        tokens: tokens,
    };

    try {
        console.log(`[Notice Push] FCM Message Payload:`, JSON.stringify(message, null, 2));
        const response = await messaging.sendEachForMulticast(message);
        console.log(`[Notice Push] Sent: ${response.successCount} success, ${response.failureCount} failed`);

        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.log(`[Notice Push] Token failed: ${resp.error?.code || resp.error?.message}`);
                    failedTokens.push(tokens[idx]);
                }
            });

            if (failedTokens.length > 0) {
                await prisma.user.updateMany({
                    where: { fcmToken: { in: failedTokens } },
                    data: { fcmToken: null }
                });
                console.log(`[Notice Push] Removed ${failedTokens.length} invalid tokens`);
            }
        }
    } catch (error) {
        console.error('[Notice Push] Error sending notifications:', error.message);
    }
}
