// File: app/api/notices/[schoolId]/route.js
// GET - Fetch all notices (with filters for mobile & web)
// POST - Create new notice
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

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
                    { priority: 'desc' },
                    { publishedAt: 'desc' }
                ],
                take: limit,
                skip,
            });

            totalCount = await prisma.notice.count({ where });

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
            return NextResponse.json(
                { error: 'Title and description are required' },
                { status: 400 }
            );
        }

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

        return NextResponse.json(notice, { status: 201 });

    } catch (error) {
        console.error('Error creating notice:', error);
        return NextResponse.json(
            { error: 'Failed to create notice', message: error.message },
            { status: 500 }
        );
    }
}