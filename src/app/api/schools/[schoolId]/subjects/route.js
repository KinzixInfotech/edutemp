import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { paginate, getPagination, apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

// GET /api/schools/[schoolId]/subjects
export async function GET(req, props) {
  const params = await props.params;
    try {
        const { schoolId } = params;

        const { page, limit, skip } = getPagination(req);
        const cacheKey = generateKey('subjects', { schoolId, page, limit });

        const result = await remember(cacheKey, async () => {
            return await paginate(prisma.subject, {
                where: {
                    class: {
                        schoolId: schoolId,
                    },
                },
                include: {
                    class: true,
                },
                orderBy: { subjectName: 'asc' },
            }, page, limit);
        }, 300);

        // Return data array for backward compatibility
        return apiResponse(result.data);
    } catch (error) {
        console.error('Error fetching subjects:', error);
        return errorResponse('Failed to fetch subjects');
    }
}

// POST /api/schools/[schoolId]/subjects
export async function POST(req, props) {
  const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await req.json();
        const { subjectName, subjectCode, classId, departmentId } = body;

        if (!subjectName || !classId) {
            return NextResponse.json(
                { error: 'Subject name and class are required' },
                { status: 400 }
            );
        }

        // Verify that class belongs to this school
        const classExists = await prisma.class.findFirst({
            where: {
                id: parseInt(classId),
                schoolId: schoolId,
            },
        });

        if (!classExists) {
            return NextResponse.json(
                { error: 'Class not found or does not belong to this school' },
                { status: 404 }
            );
        }

        // Use a default department if not provided (get first department or create default)
        let finalDepartmentId = departmentId ? parseInt(departmentId) : null;

        if (!finalDepartmentId) {
            // Get or create a default "General" department
            let defaultDept = await prisma.department.findFirst({
                where: { name: 'General' },
            });

            if (!defaultDept) {
                defaultDept = await prisma.department.create({
                    data: { name: 'General' },
                });
            }

            finalDepartmentId = defaultDept.id;
        }

        const subject = await prisma.subject.create({
            data: {
                subjectName,
                subjectCode: subjectCode || null,
                classId: parseInt(classId),
                departmentId: finalDepartmentId,
            },
            include: {
                class: {
                    select: {
                        className: true,
                    },
                },
                department: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // Invalidate subjects cache
        await invalidatePattern(`subjects:${schoolId}*`);

        return NextResponse.json(subject);
    } catch (error) {
        console.error('Error creating subject:', error);
        return NextResponse.json(
            { error: 'Failed to create subject' },
            { status: 500 }
        );
    }
}
