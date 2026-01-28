import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

const HPC_CACHE_TTL = 600; // 10 minutes

// GET - Fetch complete HPC data for a student
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { studentId, academicYearId, termNumber } = searchParams;

    if (!schoolId || !studentId) {
        return NextResponse.json(
            { error: "schoolId and studentId are required" },
            { status: 400 }
        );
    }

    try {
        // Verify student belongs to this school
        const student = await prisma.student.findFirst({
            where: { userId: studentId, schoolId },
            include: {
                class: { select: { className: true } },
                section: { select: { name: true } },
                user: { select: { profilePicture: true } }
            }
        });

        if (!student) {
            return NextResponse.json(
                { error: "Student not found in this school" },
                { status: 404 }
            );
        }

        const baseFilter = {
            studentId,
            ...(academicYearId && { academicYearId }),
            ...(termNumber && { termNumber: Number(termNumber) })
        };

        // Fetch all HPC data in parallel
        const [
            competencyAssessments,
            activityRecords,
            selAssessments,
            reflections,
            teacherFeedback,
            parentFeedback,
            academicYear
        ] = await Promise.all([
            // Competency Assessments
            prisma.competencyAssessment.findMany({
                where: baseFilter,
                include: {
                    competency: {
                        include: { subject: { select: { subjectName: true } } }
                    }
                },
                orderBy: [
                    { competency: { subject: { subjectName: "asc" } } },
                    { competency: { order: "asc" } }
                ]
            }),
            // Activity Records
            prisma.studentActivityRecord.findMany({
                where: baseFilter,
                include: {
                    activity: {
                        include: { category: { select: { name: true, icon: true } } }
                    }
                }
            }),
            // SEL Assessments
            prisma.sELAssessment.findMany({
                where: baseFilter,
                include: { parameter: { select: { name: true, category: true } } },
                orderBy: [{ parameter: { category: "asc" } }, { parameter: { order: "asc" } }]
            }),
            // Student Reflections
            prisma.studentReflection.findMany({
                where: baseFilter,
                orderBy: { submittedAt: "desc" }
            }),
            // Teacher Feedback
            prisma.teacherFeedback.findMany({
                where: baseFilter,
                include: { teacher: { select: { name: true, designation: true } } },
                orderBy: { submittedAt: "desc" }
            }),
            // Parent Feedback
            prisma.parentFeedback.findMany({
                where: baseFilter,
                include: { parent: { select: { name: true } } },
                orderBy: { submittedAt: "desc" }
            }),
            // Academic Year info
            academicYearId
                ? prisma.academicYear.findUnique({
                    where: { id: academicYearId },
                    select: { name: true }
                })
                : null
        ]);

        // Group competencies by subject
        const competenciesBySubject = competencyAssessments.reduce((acc, ca) => {
            const subjectName = ca.competency.subject.subjectName;
            if (!acc[subjectName]) {
                acc[subjectName] = [];
            }
            acc[subjectName].push({
                competency: ca.competency.name,
                grade: ca.grade,
                remarks: ca.remarks
            });
            return acc;
        }, {});

        // Group activities by category
        const activitiesByCategory = activityRecords.reduce((acc, ar) => {
            const categoryName = ar.activity.category.name;
            if (!acc[categoryName]) {
                acc[categoryName] = [];
            }
            acc[categoryName].push({
                activity: ar.activity.name,
                participationRating: ar.participationRating,
                consistencyRating: ar.consistencyRating,
                attitudeRating: ar.attitudeRating,
                achievements: ar.achievements,
                remarks: ar.remarks
            });
            return acc;
        }, {});

        // Group SEL by category
        const selByCategory = selAssessments.reduce((acc, sa) => {
            const category = sa.parameter.category || "General";
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push({
                parameter: sa.parameter.name,
                grade: sa.grade,
                remarks: sa.remarks
            });
            return acc;
        }, {});

        return NextResponse.json({
            student: {
                name: student.name,
                rollNumber: student.rollNumber,
                admissionNo: student.admissionNo,
                class: student.class.className,
                section: student.section.name,
                profilePicture: student.user?.profilePicture
            },
            academicYear: academicYear?.name || null,
            termNumber: termNumber ? Number(termNumber) : null,
            hpc: {
                academicCompetencies: competenciesBySubject,
                coCurricularActivities: activitiesByCategory,
                behaviorAndSEL: selByCategory,
                studentReflection: reflections[0] || null,
                teacherFeedback: teacherFeedback,
                parentFeedback: parentFeedback
            }
        });
    } catch (err) {
        console.error("Error fetching HPC report:", err);
        return NextResponse.json(
            { error: "Failed to fetch HPC report", message: err.message },
            { status: 500 }
        );
    }
}

// POST - Record HPC report generation
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { studentId, academicYearId, termNumber, pdfUrl, generatedById } = body;

    if (!schoolId || !studentId || !academicYearId || !termNumber || !generatedById) {
        return NextResponse.json(
            { error: "studentId, academicYearId, termNumber, and generatedById are required" },
            { status: 400 }
        );
    }

    try {
        const report = await prisma.hPCReport.upsert({
            where: {
                studentId_academicYearId_termNumber: {
                    studentId,
                    academicYearId,
                    termNumber: Number(termNumber)
                }
            },
            update: {
                pdfUrl: pdfUrl || null,
                generatedAt: new Date(),
                generatedById
            },
            create: {
                studentId,
                academicYearId,
                termNumber: Number(termNumber),
                schoolId,
                pdfUrl: pdfUrl || null,
                generatedById
            }
        });

        return NextResponse.json({
            message: "HPC report recorded successfully",
            report
        });
    } catch (err) {
        console.error("Error recording HPC report:", err);
        return NextResponse.json(
            { error: "Failed to record HPC report", message: err.message },
            { status: 500 }
        );
    }
}
