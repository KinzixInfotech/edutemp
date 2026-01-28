import prisma from '@/lib/prisma';

/**
 * Generates the full HPC report data for a single student and term.
 * @param {string} schoolId 
 * @param {string} studentId 
 * @param {number} termNumber 
 * @returns {Promise<Object>} The complete report data object
 */
export async function getHPCReportData(schoolId, studentId, termNumber) {
    if (!studentId || !termNumber) {
        throw new Error('Student ID and Term Number are required');
    }

    try {
        // Fetch all data in parallel for performance
        const [
            student,
            academicYear,
            competencyAssessments,
            activityRecords,
            selAssessments,
            reflection,
            teacherFeedback,
            parentFeedback
        ] = await Promise.all([
            // 1. Student Info
            prisma.student.findUnique({
                where: { userId: studentId },
                include: {
                    class: true,
                    section: true,
                    user: { select: { name: true, profilePicture: true } }
                }
            }),

            // 2. Active Academic Year
            prisma.academicYear.findFirst({
                where: { schoolId, isActive: true }
            }),

            // 3. Academic Competencies
            prisma.competencyAssessment.findMany({
                where: {
                    studentId,
                    termNumber,
                    competency: { schoolId } // Ensure belongs to school
                },
                include: {
                    competency: {
                        include: { subject: true }
                    }
                }
            }),

            // 4. Co-Curricular Activities
            prisma.studentActivityRecord.findMany({
                where: { studentId, termNumber },
                include: {
                    activity: {
                        include: { category: true }
                    }
                }
            }),

            // 5. SEL Assessments
            prisma.sELAssessment.findMany({
                where: { studentId, termNumber },
                include: {
                    parameter: true
                }
            }),

            // 6. Student Reflection
            prisma.studentReflection.findFirst({
                where: { studentId, termNumber }
            }),

            // 7. Teacher Feedback
            prisma.teacherFeedback.findFirst({
                where: { studentId, termNumber },
                include: {
                    teacher: {
                        include: { user: { select: { name: true } } }
                    }
                }
            }),

            // 8. Parent Feedback
            prisma.parentFeedback.findFirst({
                where: { studentId, termNumber },
                include: {
                    parent: {
                        include: { user: { select: { name: true } } }
                    }
                }
            })
        ]);

        if (!student) {
            throw new Error('Student not found');
        }

        // Structure the response to match what the frontend/PDF template expects
        return {
            student: {
                id: student.userId,
                name: student.user?.name || student.name,
                rollNumber: student.rollNumber,
                class: student.class?.name,
                section: student.section?.name,
                admissionNo: student.admissionNo,
                dob: student.dob,
                profilePicture: student.user?.profilePicture
            },
            termInfo: {
                termNumber,
                academicYear: academicYear?.name || 'Current Year'
            },
            hpc: {
                competencyAssessments,
                activityRecords,
                selAssessments: selAssessments || [], // Include SEL data
                behaviorAndSEL: groupSELByCategory(selAssessments), // Helper for structured access if needed
                academicCompetencies: groupCompetenciesBySubject(competencyAssessments), // Helper
                coCurricularActivities: groupActivitiesByCategory(activityRecords) // Helper
            },
            reflection,
            teacherFeedback,
            parentFeedback
        };

    } catch (error) {
        console.error('Error generating HPC Report Data:', error);
        throw error;
    }
}

// Helpers to pre-group data if the frontend expects it, 
// though the PDF template does its own grouping. 
// We include both raw arrays and grouped objects for flexibility.

function groupCompetenciesBySubject(assessments = []) {
    return assessments.reduce((acc, item) => {
        const subject = item.competency?.subject?.name || 'General';
        if (!acc[subject]) acc[subject] = [];
        acc[subject].push(item);
        return acc;
    }, {});
}

function groupActivitiesByCategory(records = []) {
    return records.reduce((acc, item) => {
        const category = item.activity?.category?.name || 'Other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {});
}

function groupSELByCategory(assessments = []) {
    if (!assessments) return {};
    return assessments.reduce((acc, item) => {
        const category = item.parameter?.category || 'General';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {});
}
