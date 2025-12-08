import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

// GET - Get exams for teacher's classes
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId, userId: teacherId } = params;

        const cacheKey = generateKey('teacher:exams', { schoolId, teacherId });

        const result = await remember(cacheKey, async () => {
            // Get teacher's assigned classes and sections
            const teacher = await prisma.teachingStaff.findUnique({
                where: { userId: teacherId },
                include: {
                    Class: {
                        where: { schoolId },
                        select: { id: true }
                    },
                    sectionsAssigned: {
                        where: { schoolId },
                        select: { classId: true, id: true }
                    }
                }
            });

            if (!teacher) {
                console.log('❌ Teacher not found:', teacherId);
                return { exams: [] };
            }

            console.log('✅ Teacher found:', {
                userId: teacher.userId,
                name: teacher.name,
                classesCount: teacher.Class?.length || 0,
                sectionsCount: teacher.sectionsAssigned?.length || 0
            });

            // Collect all class IDs (from class teacher role and sections)
            const classIds = new Set();

            if (teacher.Class && teacher.Class.length > 0) {
                teacher.Class.forEach(cls => {
                    console.log('  📚 Class teacher for class ID:', cls.id);
                    classIds.add(cls.id);
                });
            }

            if (teacher.sectionsAssigned && teacher.sectionsAssigned.length > 0) {
                teacher.sectionsAssigned.forEach(section => {
                    console.log('  📝 Section assigned:', {
                        sectionId: section.id,
                        classId: section.classId
                    });
                    if (section.classId) {
                        classIds.add(section.classId);
                    }
                });
            }

            console.log('🎯 Total unique class IDs:', Array.from(classIds));

            if (classIds.size === 0) {
                console.log('⚠️ No classes found for teacher');
                return { exams: [] };
            }

            // First, let's see ALL exams in the school to debug
            const allExams = await prisma.exam.findMany({
                where: {
                    schoolId,
                    status: { not: 'DRAFT' }
                },
                include: {
                    classes: {
                        select: {
                            id: true,
                            className: true
                        }
                    }
                }
            });

            console.log('🔍 ALL exams in school:', allExams.map(e => ({
                id: e.id,
                title: e.title,
                classIds: e.classes.map(c => c.id),
                classNames: e.classes.map(c => c.className)
            })));

            // Fetch exams that have ANY of the teacher's classes
            const exams = await prisma.exam.findMany({
                where: {
                    schoolId,
                    classes: {
                        some: {
                            id: {
                                in: Array.from(classIds)
                            }
                        }
                    },
                    status: {
                        not: 'DRAFT' // Only show published/active exams
                    }
                },
                include: {
                    academicYear: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    classes: {
                        select: {
                            id: true,
                            className: true
                        }
                    },
                    subjects: {
                        include: {
                            subject: {
                                select: {
                                    id: true,
                                    subjectName: true,
                                    subjectCode: true
                                }
                            }
                        }
                    },
                    _count: {
                        select: {
                            results: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            console.log(`📊 Found ${exams.length} exams for teacher ${teacherId}`);
            if (exams.length > 0) {
                console.log('  Exams:', exams.map(e => ({
                    id: e.id,
                    title: e.title,
                    status: e.status,
                    classIds: e.classes.map(c => c.id)
                })));
            }

            return { exams };
        }, 300); // Cache for 5 minutes

        return NextResponse.json(result.exams);
    } catch (error) {
        console.error("Error fetching teacher's exams:", error);
        return NextResponse.json(
            { error: "Failed to fetch exams" },
            { status: 500 }
        );
    }
}
