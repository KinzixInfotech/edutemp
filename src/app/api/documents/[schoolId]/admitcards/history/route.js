import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadToR2, generateFileKey } from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';

export const GET = withSchoolAccess(async function GET(request, props) {
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
                className: true
              }
            },
            section: {
              select: {
                name: true
              }
            },
            user: {
              select: {
                profilePicture: true
              }
            }
          }
        },
        exam: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        issueDate: 'desc'
      }
    });

    return NextResponse.json(admitCards);
  } catch (error) {
    console.error('Error fetching admit cards history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admit cards', message: error.message },
      { status: 500 }
    );
  }
});

export const POST = withSchoolAccess(async function POST(request, props) {
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

    const { examId, students, batchId: clientBatchId, showToParent } = body;
    let { zipUrl } = body; // Might be null if uploading now

    // 1. Handle Server-Side Upload if file is present
    if (file) {
      console.log("Uploading file server-side:", file.name, file.size);
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const key = generateFileKey(file.name, { folder: 'certificates', schoolId });
        const uploadedUrl = await uploadToR2(key, buffer, file.type);
        console.log("R2 upload success:", uploadedUrl);

        if (file.name.endsWith('.zip')) {
          zipUrl = uploadedUrl;
        } else {
          if (students.length === 1) {
            students[0].fileUrl = uploadedUrl;
          }
        }
      } catch (uploadError) {
        console.error("R2 upload failed:", uploadError);
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
    const admitCardsData = students.map((student) => ({
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
      showToParent: showToParent || false,
      sharedAt: showToParent ? new Date() : null
    }));

    console.log("Saving admit cards count:", admitCardsData.length);

    const result = await prisma.admitCard.createMany({
      data: admitCardsData
    });

    console.log("CreateMany result:", result);

    // Send push notifications if showToParent is enabled
    if (showToParent && students.length > 0) {
      try {
        const { sendNotification } = await import('@/lib/notifications/notificationHelper');

        const studentIds = students.map((s) => s.studentId).filter(Boolean);

        // Get parent user IDs for these students
        const parentRelations = await prisma.studentParentLink.findMany({
          where: { studentId: { in: studentIds } },
          select: { parent: { select: { userId: true } } }
        });

        const parentUserIds = [...new Set(parentRelations.map((p) => p.parent.userId))];

        if (parentUserIds.length > 0) {
          await sendNotification({
            schoolId,
            title: 'New Admit Card Available',
            message: 'An admit card has been shared with you. Check your Documents section.',
            type: 'EXAM',
            targetOptions: { userIds: parentUserIds },
            metadata: { type: 'admit_card', examId }
          });
          console.log(`Sent notification to ${parentUserIds.length} parents`);
        }
      } catch (notifError) {
        console.error('Failed to send parent notifications:', notifError);
        // Don't fail the whole request for notification errors
      }
    }

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
});

export const DELETE = withSchoolAccess(async function DELETE(request, props) {
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
});