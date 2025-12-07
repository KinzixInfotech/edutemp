import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { sendNotification } from '@/lib/notifications/notificationHelper';

export async function GET(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(request.url);
        const batchId = searchParams.get('batchId');
        const studentId = searchParams.get('studentId');

        const whereClause = {
            schoolId,
            ...(studentId && { studentId }),
            ...(batchId && {
                layoutConfig: {
                    path: ['batchId'],
                    equals: batchId
                }
            })
        };

        const idCards = await prisma.digitalIdCard.findMany({
            where: whereClause,
            include: {
                student: {
                    select: {
                        name: true,
                        rollNumber: true,
                        admissionNo: true,
                        class: { select: { className: true } },
                        section: { select: { name: true } },
                        user: { select: { profilePicture: true } }
                    }
                }
            },
            orderBy: { generatedAt: 'desc' }
        });

        return NextResponse.json(idCards);
    } catch (error) {
        console.error('Error fetching ID cards:', error);
        return NextResponse.json({ error: 'Failed to fetch ID cards' }, { status: 500 });
    }
}

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;

        const formData = await request.formData();
        const file = formData.get('file');
        const bodyStr = formData.get('data');

        if (!bodyStr) {
            return NextResponse.json({ error: "Missing data payload" }, { status: 400 });
        }

        const body = JSON.parse(bodyStr);
        const { students, batchId: clientBatchId, templateId, validUntil, showToParent = false, issuedById } = body;
        let { zipUrl } = body;

        // Server-side upload
        if (file) {
            try {
                const { utapi } = await import('@/lib/server-uploadthing');
                const response = await utapi.uploadFiles([file]);
                if (response[0]?.data?.url) {
                    const uploadedUrl = response[0].data.url;
                    if (file.name.endsWith('.zip')) {
                        zipUrl = uploadedUrl;
                    } else if (students.length === 1) {
                        students[0].fileUrl = uploadedUrl;
                    }
                }
            } catch (err) {
                console.error("Upload failed:", err);
                return NextResponse.json({ error: "Upload failed" }, { status: 500 });
            }
        }

        const batchId = clientBatchId || uuidv4();

        const idCardsData = students.map(student => ({
            schoolId,
            studentId: student.studentId,
            templateId,
            validUntil: validUntil ? new Date(validUntil) : null,
            status: 'active',
            fileUrl: student.fileUrl || null,
            layoutConfig: {
                ...student.layoutConfig,
                batchId,
                zipUrl: zipUrl || null
            },
            generatedAt: new Date(),
            showToParent,
            sharedAt: showToParent ? new Date() : null,
        }));

        const result = await prisma.digitalIdCard.createMany({
            data: idCardsData
        });

        // Send notification to parents if showToParent is enabled
        if (showToParent && students.length > 0) {
            try {
                const studentIds = students.map(s => s.studentId);
                const parentRelations = await prisma.studentParentLink.findMany({
                    where: { studentId: { in: studentIds } },
                    select: { parent: { select: { userId: true } } }
                });
                const parentUserIds = [...new Set(parentRelations.map(p => p.parent.userId))];

                if (parentUserIds.length > 0) {
                    await sendNotification({
                        schoolId,
                        title: "🪪 ID Card Available",
                        message: `New ID card is now available for download`,
                        type: 'GENERAL',
                        priority: 'NORMAL',
                        icon: '🪪',
                        targetOptions: { userIds: parentUserIds },
                        senderId: issuedById || 'system',
                        sendPush: true,
                        actionUrl: '/documents',
                        metadata: { batchId, type: 'idcard' }
                    });
                }
            } catch (notifErr) {
                console.warn('⚠️ Notification failed:', notifErr.message);
            }
        }

        return NextResponse.json({ success: true, count: result.count, batchId, sharedWithParents: showToParent });

    } catch (error) {
        console.error('Error saving ID cards:', error);
        return NextResponse.json({ error: 'Failed to save ID cards' }, { status: 500 });
    }
}

export async function DELETE(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const batchId = searchParams.get('batchId');

        if (batchId) {
            const result = await prisma.digitalIdCard.deleteMany({
                where: {
                    schoolId,
                    layoutConfig: {
                        path: ['batchId'],
                        equals: batchId
                    }
                }
            });
            return NextResponse.json({ success: true, count: result.count });
        } else if (id) {
            await prisma.digitalIdCard.delete({
                where: { id, schoolId }
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Missing id or batchId' }, { status: 400 });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
