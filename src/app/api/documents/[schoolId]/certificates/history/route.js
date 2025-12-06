import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(request.url);
        const templateId = searchParams.get('templateId');

        const whereClause = {
            schoolId,
            ...(templateId && templateId !== 'all' && { templateId: templateId }),
        };

        const certificates = await prisma.certificateGenerated.findMany({
            where: whereClause,
            include: {
                student: {
                    select: {
                        name: true,
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
                template: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
            },
            orderBy: {
                issueDate: 'desc',
            },
        });

        return NextResponse.json(certificates);
    } catch (error) {
        console.error('Error fetching certificate history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch certificates', message: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await request.json();
        console.log("Certificate History POST received:", { schoolId, bodySummary: { ...body, students: body.students?.length } });

        const { templateId, students, zipUrl, batchId: clientBatchId } = body;

        const batchId = clientBatchId || uuidv4();
        console.log("Processing batch:", batchId);

        const certificatesData = students.map((student, index) => {
            const uniqueSuffix = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;
            const certificateNumber = student.certificateNumber || `CERT-${uniqueSuffix}-${index}`;

            return {
                schoolId,
                templateId,
                studentId: student.studentId,
                certificateNumber,
                customFields: {
                    ...student.customFields,
                    batchId,
                    zipUrl: zipUrl || null,
                    fileUrl: student.fileUrl || null
                },
                fileUrl: student.fileUrl || null,
                issueDate: new Date(),
                status: 'issued'
            };
        });

        console.log("Saving certificates count:", certificatesData.length);

        const result = await prisma.certificateGenerated.createMany({
            data: certificatesData,
        });

        console.log("CreateMany result:", result);

        return NextResponse.json({
            success: true,
            count: result.count,
            batchId,
            zipUrl
        });

    } catch (error) {
        console.error('Error saving certificates:', error);
        return NextResponse.json(
            { error: 'Failed to save certificates', message: error.message, stack: error.stack },
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
            const result = await prisma.certificateGenerated.deleteMany({
                where: {
                    schoolId,
                    customFields: {
                        path: ['batchId'],
                        equals: batchId
                    }
                }
            });
            return NextResponse.json({ success: true, count: result.count });
        } else {
            await prisma.certificateGenerated.delete({
                where: { id, schoolId }
            });
            return NextResponse.json({ success: true });
        }

    } catch (error) {
        console.error('Error deleting certificate(s):', error);
        return NextResponse.json(
            { error: 'Failed to delete', message: error.message },
            { status: 500 }
        );
    }
}
