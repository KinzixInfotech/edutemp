import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { paginate, getPagination, apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

// GET /api/schools/[schoolId]/subjects
export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  try {
    const { schoolId } = params;

    const { page, limit, skip } = getPagination(req);
    const cacheKey = generateKey('subjects', { schoolId, page, limit });

    const result = await remember(cacheKey, async () => {
      return await paginate(prisma.subject, {
        where: {
          class: {
            schoolId: schoolId
          }
        },
        include: {
          class: true
        },
        orderBy: { subjectName: 'asc' }
      }, page, limit);
    }, 300);

    // Return data array for backward compatibility
    return apiResponse(result.data);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return errorResponse('Failed to fetch subjects');
  }
});

// POST /api/schools/[schoolId]/subjects
export const POST = withSchoolAccess(async function POST(req, props) {
  const params = await props.params;
  try {
    const { schoolId } = params;
    const body = await req.json();
    const { subjectName, subjectCode, type = 'CORE', classIds, departmentId } = body;

    // Support both legacy `classId` and new `classIds`
    let targetClassIds = classIds || [];
    if (body.classId && targetClassIds.length === 0) {
      targetClassIds = [body.classId];
    }

    if (!subjectName || targetClassIds.length === 0) {
      return NextResponse.json(
        { error: 'Subject name and at least one class are required' },
        { status: 400 }
      );
    }

    // Verify that classes belong to this school
    const classesExist = await prisma.class.findMany({
      where: {
        id: { in: targetClassIds.map((id) => parseInt(id)) },
        schoolId: schoolId
      }
    });

    if (classesExist.length !== targetClassIds.length) {
      return NextResponse.json(
        { error: 'One or more classes not found or do not belong to this school' },
        { status: 404 }
      );
    }

    // Use a default department if not provided
    let finalDepartmentId = departmentId ? parseInt(departmentId) : null;
    if (!finalDepartmentId) {
      let defaultDept = await prisma.department.findFirst({
        where: { name: 'General' }
      });

      if (!defaultDept) {
        defaultDept = await prisma.department.create({
          data: { name: 'General' }
        });
      }
      finalDepartmentId = defaultDept.id;
    }

    // Transaction to create Global Subject & Class Mappings
    const result = await prisma.$transaction(async (tx) => {
      // Check if GlobalSubject already exists
      let globalSubject = await tx.globalSubject.findFirst({
        where: {
          schoolId,
          name: { equals: subjectName, mode: 'insensitive' }
        }
      });

      if (!globalSubject) {
        globalSubject = await tx.globalSubject.create({
          data: {
            name: subjectName,
            code: subjectCode || null,
            type: type,
            schoolId: schoolId
          }
        });
      } else if (globalSubject.type !== type || globalSubject.code !== subjectCode) {
        // Optionally update global stats if they try to recreate
        globalSubject = await tx.globalSubject.update({
          where: { id: globalSubject.id },
          data: { type, code: subjectCode || null }
        });
      }

      // Create subject mapping for each class if it doesn't already exist
      const createdSubjects = [];
      for (const cClass of classesExist) {
        const existingMapping = await tx.subject.findFirst({
          where: {
            globalSubjectId: globalSubject.id,
            classId: cClass.id
          }
        });

        if (!existingMapping) {
          const mappedSubject = await tx.subject.create({
            data: {
              globalSubjectId: globalSubject.id,
              subjectName,
              subjectCode: subjectCode || null,
              isOptional: type === 'OPTIONAL',
              classId: cClass.id,
              departmentId: finalDepartmentId
            },
            include: {
              class: { select: { className: true } },
              department: { select: { name: true } }
            }
          });
          createdSubjects.push(mappedSubject);
        }
      }

      return createdSubjects;
    });

    // Invalidate subjects cache
    await invalidatePattern(`subjects:${schoolId}*`);

    // Return the array of created subjects or standard response
    return NextResponse.json(
      result.length === 1 ? result[0] : { message: "Bulk subjects created", count: result.length, subjects: result }
    );
  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json(
      { error: 'Failed to create subject' },
      { status: 500 }
    );
  }
});