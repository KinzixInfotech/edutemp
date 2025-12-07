// GET /api/schools/[schoolId]/parents/[parentId]/documents
// Fetch all documents shared with parent (certificates, admit cards, ID cards)

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { apiResponse, errorResponse } from "@/lib/api-utils";

export async function GET(request, props) {
    const params = await props.params;
    const url = new URL(request.url);
    const queryStudentId = url.searchParams.get('studentId');

    try {
        const { schoolId, parentId } = params;

        if (!schoolId || !parentId) {
            console.log('❌ Missing schoolId or parentId:', { schoolId, parentId });
            return errorResponse('School ID and Parent ID are required', 400);
        }

        console.log('🔍 Fetching documents for parent:', { parentId, schoolId, queryStudentId });

        // Get parent's children (filter by studentId if provided)
        const parentRelations = await prisma.studentParentLink.findMany({
            where: {
                parent: { userId: parentId },
                student: {
                    is: {
                        schoolId,
                        ...(queryStudentId ? { userId: queryStudentId } : {})
                    }
                }
            },
            select: {
                studentId: true,
                student: {
                    select: {
                        userId: true,
                        rollNumber: true,
                        admissionNo: true,
                        user: {
                            select: {
                                name: true,
                                profilePicture: true,
                            }
                        },
                        class: {
                            select: {
                                className: true,
                            }
                        },
                        section: {
                            select: {
                                name: true,
                            }
                        }
                    }
                }
            }
        });

        console.log(`✅ Found ${parentRelations.length} parent relations`);
        const studentIds = parentRelations.map(r => r.studentId);
        console.log(`Students linked:`, studentIds);

        if (studentIds.length === 0) {
            return apiResponse({ documents: [], childrenCount: 0 });
        }

        // Fetch all documents where showToParent = true
        const [certificates, idCards, admitCards] = await Promise.all([
            // Certificates
            prisma.certificateGenerated.findMany({
                where: {
                    studentId: { in: studentIds },
                    schoolId,
                    showToParent: true,
                },
                include: {
                    student: {
                        select: {
                            user: { select: { name: true } },
                            class: { select: { className: true } },
                        }
                    },
                    template: {
                        select: { name: true, templateType: true } // Fixed: type -> templateType
                    }
                },
                orderBy: { sharedAt: 'desc' },
            }),

            // ID Cards
            prisma.digitalIdCard.findMany({
                where: {
                    studentId: { in: studentIds },
                    schoolId,
                    showToParent: true,
                },
                include: {
                    student: {
                        select: {
                            user: { select: { name: true } },
                            class: { select: { className: true } },
                        }
                    },
                },
                orderBy: { sharedAt: 'desc' },
            }),

            // Admit Cards
            prisma.admitCard.findMany({
                where: {
                    studentId: { in: studentIds },
                    schoolId,
                    showToParent: true,
                },
                include: {
                    student: {
                        select: {
                            user: { select: { name: true } },
                            class: { select: { className: true } },
                        }
                    },
                    exam: {
                        select: { title: true, startDate: true, endDate: true }
                    }
                },
                orderBy: { sharedAt: 'desc' },
            }),
        ]);

        console.log(`📄 Documents found: Certificates=${certificates.length}, IDCards=${idCards.length}, AdmitCards=${admitCards.length}`);

        // Transform and combine all documents
        const documents = [
            ...certificates.map(c => ({
                id: c.id,
                type: 'certificate',
                title: c.template?.name || 'Certificate',
                subType: c.template?.type,
                studentId: c.studentId,
                studentName: c.student?.user?.name,
                className: c.student?.class?.className,
                fileUrl: c.fileUrl,
                issueDate: c.issueDate,
                sharedAt: c.sharedAt,
                certificateNumber: c.certificateNumber,
            })),
            ...idCards.map(i => ({
                id: i.id,
                type: 'idcard',
                title: 'ID Card',
                subType: i.status,
                studentId: i.studentId,
                studentName: i.student?.user?.name,
                className: i.student?.class?.className,
                fileUrl: i.fileUrl,
                issueDate: i.generatedAt,
                sharedAt: i.sharedAt,
                validUntil: i.validUntil,
            })),
            ...admitCards.map(a => ({
                id: a.id,
                type: 'admitcard',
                title: `Admit Card - ${a.exam?.title || 'Exam'}`,
                subType: 'exam',
                studentId: a.studentId,
                studentName: a.student?.user?.name,
                className: a.student?.class?.className,
                fileUrl: a.layoutConfig?.fileUrl || null,
                issueDate: a.issueDate,
                sharedAt: a.sharedAt,
                examTitle: a.exam?.title,
                examDate: a.exam?.startDate,
                seatNumber: a.seatNumber,
            })),
        ].sort((a, b) => new Date(b.sharedAt || b.issueDate) - new Date(a.sharedAt || a.issueDate));

        return apiResponse({
            documents,
            stats: {
                total: documents.length,
                certificates: certificates.length,
                idCards: idCards.length,
                admitCards: admitCards.length,
            },
            children: parentRelations.map(r => ({
                studentId: r.studentId,
                name: r.student?.user?.name,
                className: r.student?.class?.className,
                section: r.student?.section?.name,
            }))
        });

    } catch (error) {
        console.error('Error fetching parent documents:', error);
        return errorResponse(error.message || 'Failed to fetch documents', 500);
    }
}
