import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DEFAULT_COMPETENCIES } from '@/lib/hpc/defaultCompetencies';

export const POST = withSchoolAccess(async function POST(req, { params }) {
  try {
    const { schoolId } = params;

    // 1. Get all subjects for the school
    const subjects = await prisma.subject.findMany({
      where: {
        class: {
          schoolId: schoolId
        }
      },
      select: { id: true, subjectName: true }
    });

    if (subjects.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No subjects found. Please add subjects first.'
      }, { status: 400 });
    }

    let addedCount = 0;
    const results = [];

    // 2. Iterate through defaults and match with subjects
    for (const [subjectKey, competencies] of Object.entries(DEFAULT_COMPETENCIES)) {
      // Find matching subjects (e.g., "Mathematics" matches "Maths", "Mathematics", "Class 5 Maths")
      const matchingSubjects = subjects.filter((s) =>
      s.subjectName.toLowerCase().includes(subjectKey.toLowerCase()) ||
      subjectKey === 'Mathematics' && s.subjectName.toLowerCase().includes('math') ||
      subjectKey === 'English' && s.subjectName.toLowerCase().includes('eng') ||
      subjectKey === 'Science' && s.subjectName.toLowerCase().includes('sci')
      );

      for (const subject of matchingSubjects) {
        for (const comp of competencies) {
          // Check if competency already exists
          const existing = await prisma.competency.findFirst({
            where: {
              subjectId: subject.id,
              name: comp.name
            }
          });

          if (!existing) {
            await prisma.competency.create({
              data: {
                subjectId: subject.id,
                name: comp.name,
                description: comp.description,
                isActive: true
              }
            });
            addedCount++;
          }
        }
        results.push({ subject: subject.subjectName, count: competencies.length });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${addedCount} default competencies across ${results.length} subjects.`,
      details: results
    });

  } catch (error) {
    console.error('Seed competencies error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
});