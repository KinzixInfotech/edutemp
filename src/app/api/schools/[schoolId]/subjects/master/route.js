import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/schools/[schoolId]/subjects/master
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;

        // Fetch all GlobalSubjects with their associated class mappings
        const masterSubjects = await prisma.globalSubject.findMany({
            where: {
                schoolId: schoolId,
            },
            include: {
                subjects: {
                    include: {
                        class: {
                            select: {
                                id: true,
                                className: true,
                            }
                        }
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Shape the response slightly for the frontend table
        const formattedData = masterSubjects.map(master => ({
            id: master.id,
            subjectName: master.name,
            subjectCode: master.code,
            type: master.type || 'CORE',
            mappings: master.subjects.map(s => ({
                mappingId: s.id,
                classId: s.class.id,
                className: s.class.className,
                isOptional: s.isOptional,
                isOverridden: s.subjectName !== master.name || s.subjectCode !== master.code
            }))
        }));

        return NextResponse.json(formattedData);
    } catch (error) {
        console.error('Error fetching master subjects:', error);
        return NextResponse.json(
            { error: 'Failed to fetch master subjects' },
            { status: 500 }
        );
    }
}
