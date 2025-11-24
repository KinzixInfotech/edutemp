import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/subjects
export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        const subjects = await prisma.subject.findMany({
            where: {
                class: {
                    schoolId: schoolId,
                },
            },
            include: {
                class: true,
            },
            orderBy: { subjectName: 'asc' },
        });

        return NextResponse.json(subjects);
    } catch (error) {
        console.error('Error fetching subjects:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subjects' },
            { status: 500 }
        );
    }
}

// POST /api/schools/[schoolId]/subjects
export async function POST(req, { params }) {
    try {
        const { schoolId } = await params;
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

        return NextResponse.json(subject);
    } catch (error) {
        console.error('Error creating subject:', error);
        return NextResponse.json(
            { error: 'Failed to create subject' },
            { status: 500 }
        );
    }
}
