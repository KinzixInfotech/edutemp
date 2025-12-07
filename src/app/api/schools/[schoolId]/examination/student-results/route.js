import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from "@/lib/cache";

// GET /api/schools/[schoolId]/examination/student-results
// Fetch all exam results for a specific student (for parent view)
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('studentId');
        const academicYearId = searchParams.get('academicYearId');

        if (!studentId) {
            return NextResponse.json(
                { error: 'Student ID is required' },
                { status: 400 }
            );
        }

        const cacheKey = generateKey('examination:student-results', { schoolId, studentId, academicYearId });

        const result = await remember(cacheKey, async () => {
            // 1. Fetch OFFLINE exam results (ExamResult)
            const offlineResults = await prisma.examResult.findMany({
                where: {
                    studentId,
                    exam: {
                        schoolId,
                        ...(academicYearId && { academicYearId }),
                    },
                },
                include: {
                    exam: {
                        select: {
                            id: true,
                            title: true,
                            type: true,
                            startDate: true,
                            endDate: true,
                            status: true,
                            createdAt: true,
                            subjects: {
                                select: {
                                    subjectId: true,
                                    maxMarks: true,
                                    passingMarks: true,
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
                    exam: {
                        endDate: 'desc'
                    }
                }
            });

            // 2. Fetch ONLINE exam attempts (StudentExamAttempt)
            const onlineAttempts = await prisma.studentExamAttempt.findMany({
                where: {
                    studentId,
                    status: 'COMPLETED',
                    exam: {
                        schoolId,
                        type: 'ONLINE',
                        ...(academicYearId && { academicYearId }),
                    }
                },
                include: {
                    exam: {
                        select: {
                            id: true,
                            title: true,
                            type: true,
                            startDate: true,
                            endDate: true,
                            status: true,
                            createdAt: true,
                            questions: {
                                select: {
                                    marks: true,
                                }
                            }
                        }
                    },
                    answers: {
                        select: {
                            isCorrect: true,
                            marksObtained: true,
                        }
                    }
                },
                orderBy: {
                    startTime: 'desc'
                }
            });

            // 3. Group offline results by exam
            const offlineExamMap = {};
            offlineResults.forEach(result => {
                const examId = result.examId;
                if (!offlineExamMap[examId]) {
                    const examSubject = result.exam.subjects.find(s => s.subjectId === result.subjectId);
                    offlineExamMap[examId] = {
                        examId,
                        examTitle: result.exam.title,
                        examType: 'OFFLINE',
                        examDate: result.exam.endDate || result.exam.startDate,
                        examStatus: result.exam.status,
                        createdAt: result.exam.createdAt,
                        subjects: [],
                        totalMarksObtained: 0,
                        totalMaxMarks: 0,
                        subjectsAttempted: 0,
                        subjectsPassed: 0,
                    };
                }

                const examSubject = result.exam.subjects.find(s => s.subjectId === result.subjectId);
                const maxMarks = examSubject?.maxMarks || 100;
                const passingMarks = examSubject?.passingMarks || 33;
                const isPassed = result.marksObtained !== null && result.marksObtained >= passingMarks;

                offlineExamMap[examId].subjects.push({
                    subjectId: result.subject.id,
                    subjectName: result.subject.subjectName,
                    subjectCode: result.subject.subjectCode,
                    marksObtained: result.marksObtained,
                    maxMarks,
                    passingMarks,
                    grade: result.grade,
                    remarks: result.remarks,
                    isAbsent: result.isAbsent,
                    isPassed,
                    percentage: result.marksObtained !== null ? Math.round((result.marksObtained / maxMarks) * 100) : null,
                });

                if (result.marksObtained !== null && !result.isAbsent) {
                    offlineExamMap[examId].totalMarksObtained += result.marksObtained;
                    offlineExamMap[examId].totalMaxMarks += maxMarks;
                    offlineExamMap[examId].subjectsAttempted += 1;
                    if (isPassed) offlineExamMap[examId].subjectsPassed += 1;
                }
            });

            // 4. Process online attempts
            const onlineExamResults = onlineAttempts.map(attempt => {
                const maxScore = attempt.exam.questions.reduce((sum, q) => sum + q.marks, 0);
                const percentage = maxScore > 0 ? Math.round((attempt.score / maxScore) * 100) : 0;
                const isPassed = percentage >= 33;

                return {
                    examId: attempt.examId,
                    examTitle: attempt.exam.title,
                    examType: 'ONLINE',
                    examDate: attempt.exam.endDate || attempt.exam.startDate,
                    examStatus: attempt.exam.status,
                    createdAt: attempt.exam.createdAt,
                    attemptId: attempt.id,
                    startTime: attempt.startTime,
                    endTime: attempt.endTime,
                    score: attempt.score,
                    maxScore,
                    percentage,
                    isPassed,
                    questionsTotal: attempt.exam.questions.length,
                    questionsCorrect: attempt.answers.filter(a => a.isCorrect).length,
                };
            });

            // 5. Combine and sort all results
            const offlineExamResults = Object.values(offlineExamMap).map(exam => ({
                ...exam,
                percentage: exam.totalMaxMarks > 0
                    ? Math.round((exam.totalMarksObtained / exam.totalMaxMarks) * 100)
                    : 0,
                isPassed: exam.subjectsPassed === exam.subjectsAttempted && exam.subjectsAttempted > 0,
            }));

            const allResults = [...offlineExamResults, ...onlineExamResults]
                .sort((a, b) => new Date(b.examDate || b.createdAt) - new Date(a.examDate || a.createdAt));

            // 6. Calculate overall statistics
            const totalExams = allResults.length;
            const totalPassed = allResults.filter(r => r.isPassed).length;
            const avgPercentage = totalExams > 0
                ? Math.round(allResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalExams)
                : 0;

            // Get the most recent exam date for badge comparison
            const latestResultDate = allResults.length > 0
                ? new Date(allResults[0].examDate || allResults[0].createdAt).toISOString()
                : null;

            return {
                results: allResults,
                stats: {
                    totalExams,
                    totalPassed,
                    totalFailed: totalExams - totalPassed,
                    passRate: totalExams > 0 ? Math.round((totalPassed / totalExams) * 100) : 0,
                    avgPercentage,
                    latestResultDate,
                }
            };
        }, 300);

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error fetching student results:', error);
        return NextResponse.json(
            { error: 'Failed to fetch student results', details: error.message },
            { status: 500 }
        );
    }
}
