import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST - Revert alumni back to active student
export async function POST(req, props) {
  const params = await props.params;
    const { schoolId, alumniId } = params;

    try {
        // Get alumni record
        const alumni = await prisma.alumni.findFirst({
            where: {
                id: alumniId,
                schoolId
            }
        });

        if (!alumni) {
            return NextResponse.json(
                { error: 'Alumni not found' },
                { status: 404 }
            );
        }

        // Update student record to revert alumni status
        await prisma.student.update({
            where: { userId: alumni.originalStudentId },
            data: {
                isAlumni: false,
                alumniConvertedAt: null,
                DateOfLeaving: null
            }
        });

        // Optionally delete alumni record or keep it for history
        // For now, we'll delete it
        await prisma.alumni.delete({
            where: { id: alumniId }
        });

        return NextResponse.json({
            success: true,
            message: 'Alumni reverted to active student',
            studentId: alumni.originalStudentId
        });

    } catch (error) {
        console.error('Error reverting alumni:', error);
        return NextResponse.json(
            { error: 'Failed to revert alumni', details: error.message },
            { status: 500 }
        );
    }
}
