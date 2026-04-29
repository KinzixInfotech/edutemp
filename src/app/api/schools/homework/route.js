import { withSchoolAccess } from "@/lib/api-auth"; // app/api/schools/homework/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { notifyHomeworkAssigned } from "@/lib/notifications/notificationHelper";

export const GET = withSchoolAccess(async function GET(req) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");
  const classId = searchParams.get("classId");
  const sectionId = searchParams.get("sectionId");
  const teacherId = searchParams.get("teacherId");
  const studentId = searchParams.get("studentId");
  const isActive = searchParams.get("isActive");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  let academicYearId = searchParams.get("academicYearId");

  if (!schoolId) {
    return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
  }

  try {
    // Auto-resolve active academic year
    if (!academicYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        select: { id: true }
      });
      academicYearId = activeYear?.id;
    }

    const where = { schoolId, ...(academicYearId && { academicYearId }) };

    if (classId) where.classId = parseInt(classId);
    if (sectionId) where.sectionId = parseInt(sectionId);
    if (teacherId) where.teacherId = teacherId;
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Server-side search by title, description, class name, or subject name
    if (search) {
      where.AND = [
      ...(where.AND || []),
      {
        OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { class: { className: { contains: search, mode: 'insensitive' } } },
        { subject: { subjectName: { contains: search, mode: 'insensitive' } } }]

      }];

    }

    // If studentId provided, get homework for that student's class/section
    if (studentId) {
      const student = await prisma.student.findUnique({
        where: { userId: studentId },
        select: { classId: true, sectionId: true }
      });

      if (student) {
        where.classId = student.classId;
        where.AND = [
        ...(where.AND || []),
        {
          OR: [
          { sectionId: null },
          { sectionId: student.sectionId }]

        }];

      }
    }

    const skip = (page - 1) * limit;

    const [homework, total] = await Promise.all([
    prisma.homework.findMany({
      where,
      include: {
        class: {
          select: {
            id: true,
            className: true
          }
        },
        section: {
          select: {
            id: true,
            name: true
          }
        },
        subject: {
          select: {
            id: true,
            subjectName: true
          }
        },
        teacher: {
          select: {
            userId: true,
            name: true
          }
        },
        submissions: studentId ? {
          where: { studentId },
          select: {
            id: true,
            status: true,
            submittedAt: true,
            grade: true,
            feedback: true
          }
        } : {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        assignedDate: 'desc'
      },
      skip,
      take: limit
    }),
    prisma.homework.count({ where })]
    );

    // Add submission stats for each homework
    const homeworkWithStats = homework.map((hw) => {
      const totalSubs = hw.submissions.length;
      const submitted = hw.submissions.filter((s) =>
      s.status === 'SUBMITTED' || s.status === 'EVALUATED'
      ).length;
      const pending = hw.submissions.filter((s) => s.status === 'PENDING').length;
      const late = hw.submissions.filter((s) => s.status === 'LATE').length;

      return {
        ...hw,
        stats: { total: totalSubs, submitted, pending, late },
        // For student view, include their submission
        mySubmission: studentId ? hw.submissions[0] : undefined
      };
    });

    return NextResponse.json({
      success: true,
      homework: homeworkWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Fetch homework error:", error);
    return NextResponse.json({ error: "Failed to fetch homework" }, { status: 500 });
  }
});

export const POST = withSchoolAccess(async function POST(req) {
  try {
    const body = await req.json();
    const {
      schoolId,
      classId,
      sectionId,
      subjectId,
      teacherId,
      title,
      description,
      fileUrl,
      fileName,
      dueDate,
      senderId
    } = body;

    // Validation
    if (!schoolId || !classId || !title || !dueDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if teacherId exists in TeachingStaff (optional - for non-teacher users)
    let validTeacherId = null;
    if (teacherId) {
      const teacher = await prisma.teachingStaff.findUnique({
        where: { userId: teacherId },
        select: { userId: true }
      });
      if (teacher) {
        validTeacherId = teacher.userId;
      }
    }

    // If no valid teacher found, try to find any teacher from the school (for admin users)
    if (!validTeacherId) {
      const anyTeacher = await prisma.teachingStaff.findFirst({
        where: { schoolId },
        select: { userId: true }
      });
      if (anyTeacher) {
        validTeacherId = anyTeacher.userId;
      } else {
        return NextResponse.json(
          { error: "No teachers found in this school. Please add a teacher first." },
          { status: 400 }
        );
      }
    }

    // Auto-resolve academic year for new homework
    let academicYearId = null;
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true }
    });
    academicYearId = activeYear?.id;

    // Create homework
    const homework = await prisma.homework.create({
      data: {
        schoolId,
        classId: parseInt(classId),
        sectionId: sectionId ? parseInt(sectionId) : null,
        subjectId: subjectId ? parseInt(subjectId) : null,
        teacherId: validTeacherId,
        title,
        description,
        fileUrl,
        fileName,
        dueDate: new Date(dueDate),
        isActive: true,
        ...(academicYearId && { academicYearId })
      },
      include: {
        class: {
          select: {
            className: true,
            sections: true
          }
        },
        section: {
          select: {
            name: true
          }
        },
        subject: {
          select: {
            subjectName: true
          }
        },
        teacher: {
          select: {
            name: true
          }
        }
      }
    });

    // Track upload in prisma.upload table (Migrated from UploadThing callback)
    if (fileUrl) {
      try {
        await prisma.upload.create({
          data: {
            schoolId,
            fileUrl: fileUrl,
            fileName: fileName || "Homework File",
            mimeType: "application/pdf",
            size: 0
          }
        });
      } catch (err) {
        console.error("Failed to track homework upload:", err);
      }
    }

    // Get students in this class/section
    const studentsWhere = {
      schoolId,
      classId: parseInt(classId)
    };
    if (sectionId) {
      studentsWhere.sectionId = parseInt(sectionId);
    }

    const students = await prisma.student.findMany({
      where: studentsWhere,
      select: { userId: true }
    });

    // Create submission records for all students
    if (students.length > 0) {
      await prisma.homeworkSubmission.createMany({
        data: students.map((student) => ({
          homeworkId: homework.id,
          studentId: student.userId,
          status: 'PENDING'
        }))
      });
    }

    // Send notifications to students and parents
    try {
      await notifyHomeworkAssigned({
        schoolId,
        classId: parseInt(classId),
        sectionId: sectionId ? parseInt(sectionId) : null,
        className: homework.class.className,
        sectionName: homework.section?.name,
        title: homework.title,
        subjectName: homework.subject?.subjectName,
        dueDate: homework.dueDate,
        senderId: senderId || teacherId,
        teacherName: homework.teacher.name
      });

    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    return NextResponse.json({
      success: true,
      homework,
      message: "Homework assigned successfully"
    }, { status: 201 });
  } catch (error) {
    console.error("Create homework error:", error);
    return NextResponse.json(
      { error: "Failed to create homework" },
      { status: 500 }
    );
  }
});

export const PATCH = withSchoolAccess(async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const homework = await prisma.homework.update({
      where: { id },
      data: updateData,
      include: {
        class: true,
        section: true,
        subject: true,
        teacher: true
      }
    });

    return NextResponse.json({
      success: true,
      homework,
      message: "Homework updated successfully"
    });
  } catch (error) {
    console.error("Update homework error:", error);
    return NextResponse.json({ error: "Failed to update homework" }, { status: 500 });
  }
});

export const DELETE = withSchoolAccess(async function DELETE(req) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.homework.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Homework deleted successfully"
    });
  } catch (error) {
    console.error("Delete homework error:", error);
    return NextResponse.json({ error: "Failed to delete homework" }, { status: 500 });
  }
});