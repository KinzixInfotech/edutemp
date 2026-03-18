import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { invalidatePattern } from "@/lib/cache";

// DELETE /api/schools/[schoolId]/subjects/master/[masterId]
export async function DELETE(req, props) {
    const params = await props.params;
    try {
        const { schoolId, masterId } = params;

        // Verify the master subject exists
        const globalSubject = await prisma.globalSubject.findUnique({
            where: { id: parseInt(masterId) },
            include: {
                subjects: {
                    include: {
                        _count: {
                            select: {
                                examSubjects: true,
                                examResults: true,
                                homework: true,
                            }
                        }
                    }
                }
            }
        });

        if (!globalSubject || globalSubject.schoolId !== schoolId) {
            return NextResponse.json({ error: 'Master subject not found' }, { status: 404 });
        }

        // Check if any mapped subjects are used
        let hasUsage = false;
        let usageDetails = '';
        for (const s of globalSubject.subjects) {
            if (s._count.examSubjects > 0 || s._count.examResults > 0 || s._count.homework > 0) {
                hasUsage = true;
                usageDetails = `One or more classes mapped to this subject are actively used in exams or homework.`;
                break;
            }
        }

        if (hasUsage) {
            return NextResponse.json(
                {
                    error: 'Cannot delete master subject',
                    message: usageDetails,
                },
                { status: 400 }
            );
        }

        // Delete the master subject (mapped Subjects will be deleted via Cascade)
        await prisma.globalSubject.delete({
            where: { id: parseInt(masterId) }
        });

        await invalidatePattern(`subjects:${schoolId}*`);

        return NextResponse.json({ message: 'Master subject and all its mappings deleted successfully' });
    } catch (error) {
        console.error('Error deleting master subject:', error);
        return NextResponse.json(
            { error: 'Failed to delete master subject' },
            { status: 500 }
        );
    }
}
