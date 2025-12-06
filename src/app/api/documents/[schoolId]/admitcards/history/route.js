import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(request.url);
        const examId = searchParams.get('examId');
        const id = searchParams.get('id');
        const batchId = searchParams.get('batchId');

        const whereClause = {
            schoolId,
            ...(id && { id }),
            ...(examId && examId !== 'all' && { examId: examId }),
            ...(batchId && {
                layoutConfig: {
                    path: ['batchId'],
                    equals: batchId
                }
            })
        };

        const admitCards = await prisma.admitCard.findMany({
            where: whereClause,
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
                        rollNumber: true,
                        admissionNo: true,
                        class: {
                            select: {
                                className: true,
                            },
                        },
                        section: {
                            select: {
                                name: true,
                            },
                        },
                        user: {
                            select: {
                                profilePicture: true,
                            },
                        },
                    },
                },
                exam: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: {
                issueDate: 'desc',
            },
        });

        return NextResponse.json(admitCards);
    } catch (error) {
        console.error('Error fetching admit cards history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch admit cards', message: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;

        const formData = await request.formData();
        const file = formData.get('file'); // PDF or ZIP
        const bodyStr = formData.get('data');

        if (!bodyStr) {
            return NextResponse.json({ error: "Missing data payload" }, { status: 400 });
        }

        const body = JSON.parse(bodyStr);
        console.log("Admit Card History POST received:", { schoolId, bodySummary: { ...body, students: body.students?.length } });

        const { examId, students, batchId: clientBatchId } = body;
        let { zipUrl } = body; // Might be null if uploading now

        // 1. Handle Server-Side Upload if file is present
        if (file) {
            console.log("Uploading file server-side:", file.name, file.size);
            try {
                const { utapi } = await import('@/lib/server-uploadthing');
                const response = await utapi.uploadFiles([file]);

                if (response[0]?.data?.url) {
                    const uploadedUrl = response[0].data.url;
                    console.log("Server-side upload success:", uploadedUrl);

                    // Determine if this is a ZIP or Single PDF based on context or mime
                    if (file.name.endsWith('.zip')) {
                        zipUrl = uploadedUrl;
                    } else {
                        // For single student, update their fileUrl
                        if (students.length === 1) {
                            students[0].fileUrl = uploadedUrl;
                        }
                    }
                } else {
                    console.error("UploadThing Error:", response[0]?.error);
                    throw new Error("Failed to upload file to storage");
                }
            } catch (uploadError) {
                console.error("Upload failed:", uploadError);
                return NextResponse.json(
                    { error: 'Failed to upload file', message: uploadError.message },
                    { status: 500 }
                );
            }
        }

        // Generate a batch ID if not provided
        const batchId = clientBatchId || uuidv4();
        console.log("Processing Admit Card batch:", batchId);

        // Prepare data for bulk insert
        const admitCardsData = students.map(student => ({
            schoolId,
            examId,
            studentId: student.studentId,
            seatNumber: student.seatNumber,
            center: student.center,
            // Inject batch info into layoutConfig
            layoutConfig: {
                ...student.layoutConfig,
                batchId,
                zipUrl: zipUrl || null,
                fileUrl: student.fileUrl || null // For single cards or specific overrides
            },
            issueDate: new Date(),
        }));

        console.log("Saving admit cards count:", admitCardsData.length);

        const result = await prisma.admitCard.createMany({
            data: admitCardsData,
        });

        console.log("CreateMany result:", result);

        return NextResponse.json({
            success: true,
            count: result.count,
            batchId,
            zipUrl
        });

    } catch (error) {
        console.error('Error saving admit cards:', error);
        return NextResponse.json(
            { error: 'Failed to save admit cards', message: error.message, stack: error.stack },
            { status: 500 }
        );
    }
}

export async function DELETE(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const batchId = searchParams.get('batchId');

        if (!id && !batchId) {
            return NextResponse.json({ error: 'Missing id or batchId' }, { status: 400 });
        }

        if (batchId) {
            const result = await prisma.admitCard.deleteMany({
                where: {
                    schoolId,
                    layoutConfig: {
                        path: ['batchId'],
                        equals: batchId
                    }
                }
            });
            return NextResponse.json({ success: true, count: result.count });
        } else {
            await prisma.admitCard.delete({
                where: { id, schoolId }
            });
            return NextResponse.json({ success: true });
        }

    } catch (error) {
        console.error('Error deleting admit card(s):', error);
        return NextResponse.json(
            { error: 'Failed to delete', message: error.message },
            { status: 500 }
        );
    }
}