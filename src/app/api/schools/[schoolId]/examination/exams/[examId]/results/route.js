import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

// GET - Get exam results for an exam (supports both ONLINE and OFFLINE exams)
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId, examId } = params;
        const { searchParams } = new URL(req.url);
        const teacherId = searchParams.get('teacherId'); // Optional: filter by teacher's sections

        const cacheKey = generateKey('exam:results', { schoolId, examId, teacherId });

        const result = await remember(cacheKey, async () => {
            // Get exam with type and subjects info
            const exam = await prisma.exam.findUnique({
                where: { id: examId },
                include: {
                    subjects: {
                        select: {
                            id: true,
                            subjectId: true,
                            maxMarks: true,
                            passingMarks: true,
                        }
                    },
                    questions: {
                        select: {
                            id: true,
                            marks: true
                        }
                    }
                }
            });

            if (!exam) {
                return { error: 'Exam not found' };
            }

            // If teacherId provided, get teacher's class IDs to filter results
            let teacherClassIds = null;
            if (teacherId) {
                const teacher = await prisma.teachingStaff.findUnique({
                    where: { userId: teacherId },
                    include: {
                        Class: {
                            where: { schoolId },
                            select: { id: true }
                        },
                        sectionsAssigned: {
                            where: { schoolId },
                            select: { id: true, classId: true }
                        }
                    }
                });

                // Collect class IDs from both class teacher role and sections
                const classIds = new Set();
                teacher?.Class?.forEach(cls => classIds.add(cls.id));
                teacher?.sectionsAssigned?.forEach(sec => {
                    if (sec.classId) classIds.add(sec.classId);
                });

                teacherClassIds = Array.from(classIds);
                console.log(`🔍 Teacher ${teacherId} class IDs:`, teacherClassIds);
            }

            let results = [];

            // ONLINE exams: fetch from StudentExamAttempt
            if (exam.type === 'ONLINE') {
                const attempts = await prisma.studentExamAttempt.findMany({
                    where: {
                        examId,
                        ...(teacherClassIds && teacherClassIds.length > 0 && {
                            student: {
                                classId: { in: teacherClassIds }
                            }
                        })
                    },
                    include: {
                        student: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        student: {
                            rollNumber: 'asc'
                        }
                    }
                });

                console.log(`📋 Found ${attempts.length} student attempts for exam ${examId}, classIds filter:`, teacherClassIds);
                if (attempts.length > 0) {
                    console.log('  Sample attempt:', {
                        studentName: attempts[0].student?.name,
                        classId: attempts[0].student?.classId,
                        score: attempts[0].score
                    });
                }

                console.log(`🔬 Exam has ${exam.subjects?.length || 0} subjects`);
                if (exam.subjects && exam.subjects.length > 0) {
                    console.log('  First subject:', exam.subjects[0]);
                }

                // Calculate total max marks from all questions
                const totalMaxMarks = exam.questions?.reduce((sum, q) => sum + (q.marks || 0), 0) || 100;
                const passingMarks = Math.ceil(totalMaxMarks * 0.33); // 33% passing

                console.log(`📊 Exam total marks: ${totalMaxMarks}, passing: ${passingMarks}`);

                // Convert online exam attempts to results format
                // For online exams, create one result per student showing total score
                results = attempts.map(attempt => ({
                    id: attempt.id,
                    examId: attempt.examId,
                    studentId: attempt.studentId,
                    subjectId: null, // Online exams don't have per-subject breakdown
                    marksObtained: attempt.score,
                    grade: null,
                    remarks: attempt.status,
                    isAbsent: attempt.status !== 'COMPLETED',
                    student: attempt.student,
                    subject: {
                        id: null,
                        subjectName: 'Overall Score',
                        subjectCode: 'TOTAL'
                    },
                    examSubject: {
                        id: null,
                        subjectId: null,
                        maxMarks: totalMaxMarks,
                        passingMarks: passingMarks
                    }
                }));

                console.log(`✅ Converted ${results.length} online exam attempts to results`);

            } else {
                // OFFLINE exams: fetch from ExamResult
                const examResults = await prisma.examResult.findMany({
                    where: {
                        examId,
                        ...(teacherClassIds && teacherClassIds.length > 0 && {
                            student: {
                                classId: { in: teacherClassIds }
                            }
                        })
                    },
                    include: {
                        student: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                    }
                                }
                            }
                        },
                        subject: {
                            select: {
                                id: true,
                                subjectName: true,
                                subjectCode: true,
                            }
                        }
                    },
                    orderBy: {
                        student: {
                            rollNumber: 'asc'
                        }
                    }
                });

                // Enrich results with examSubject info
                results = examResults.map(result => {
                    const examSubject = exam.subjects.find(es => es.subjectId === result.subjectId);
                    return {
                        ...result,
                        examSubject: examSubject || null
                    };
                });
            }

            return {
                exam,
                results
            };
        }, 180); // Cache for 3 minutes

        console.log(`✅ Returning ${result.results?.length || 0} results for exam ${examId}`);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching exam results:", error);
        return NextResponse.json(
            { error: "Failed to fetch exam results" },
            { status: 500 }
        );
    }
}
