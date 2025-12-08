// GET /api/schools/[schoolId]/students/[studentId]/documents
// Fetch all documents for a student (certificates, admit cards, ID cards)

import prisma from '@/lib/prisma';
import { apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey } from "@/lib/cache";

export async function GET(request, props) {
    const params = await props.params;

    try {
        const { schoolId, studentId } = params;

        if (!schoolId || !studentId) {
            return errorResponse('School ID and Student ID are required', 400);
        }

        console.log('🔍 Fetching documents for student:', { studentId, schoolId });

        const cacheKey = generateKey('student:documents', { schoolId, studentId });

        const result = await remember(cacheKey, async () => {
            // Get student record by userId
            const student = await prisma.student.findFirst({
                where: {
                    userId: studentId,
                    schoolId
                },
                select: {
                    userId: true,
                    rollNumber: true,
                    admissionNo: true,
                    name: true,
                    user: { select: { name: true } },
                    class: { select: { className: true } },
                    section: { select: { name: true } }
                }
            });

            if (!student) {
                console.log('❌ Student not found');
                return { documents: [], stats: { total: 0, certificates: 0, idCards: 0, admitCards: 0 } };
            }

            const studentRecordId = student.userId;
            console.log('✅ Found student:', studentRecordId);

            // Fetch all documents
            const [certificates, idCards, admitCards] = await Promise.all([
                // Certificates (showToParent typically means shared/published)
                prisma.certificateGenerated.findMany({
                    where: {
                        studentId: studentRecordId,
                        schoolId,
                    },
                    include: {
                        template: {
                            select: { name: true, templateType: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                }),

                // ID Cards
                prisma.digitalIdCard.findMany({
                    where: {
                        studentId: studentRecordId,
                        schoolId,
                    },
                    orderBy: { generatedAt: 'desc' },
                }),

                // Admit Cards
                prisma.admitCard.findMany({
                    where: {
                        studentId: studentRecordId,
                        schoolId,
                    },
                    include: {
                        exam: {
                            select: { title: true, startDate: true, endDate: true }
                        }
                    },
                    orderBy: { issueDate: 'desc' },
                }),
            ]);

            console.log(`📄 Documents found: Certificates=${certificates.length}, IDCards=${idCards.length}, AdmitCards=${admitCards.length}`);
            if (admitCards.length > 0) {
                console.log('📋 Sample AdmitCard:', JSON.stringify(admitCards[0], null, 2));
            }

            // Transform documents
            const documents = [
                ...certificates.map(c => ({
                    id: c.id,
                    type: 'certificate',
                    docType: 'CERTIFICATE',
                    title: c.template?.name || 'Certificate',
                    subType: c.template?.templateType,
                    fileUrl: c.fileUrl,
                    pdfUrl: c.fileUrl,
                    createdAt: c.createdAt,
                    issueDate: c.issueDate,
                    certificateNumber: c.certificateNumber,
                })),
                ...idCards.map(i => ({
                    id: i.id,
                    type: 'idcard',
                    docType: 'ID_CARD',
                    title: 'ID Card',
                    subType: i.status,
                    fileUrl: i.fileUrl || i.layoutConfig?.fileUrl,
                    pdfUrl: i.fileUrl || i.layoutConfig?.fileUrl,
                    createdAt: i.generatedAt,
                    validUntil: i.validUntil,
                })),
                ...admitCards.map(a => {
                    // layoutConfig is a JSON object, extract fileUrl from it
                    const config = typeof a.layoutConfig === 'string' ? JSON.parse(a.layoutConfig) : a.layoutConfig;
                    // Use fileUrl, or fallback to zipUrl, or create a view URL
                    const admitFileUrl = config?.fileUrl || config?.zipUrl || null;
                    // Web view URL for rendering admit card in browser
                    const webViewUrl = `/dashboard/documents/admitcards/${a.id}`;
                    return {
                        id: a.id,
                        type: 'admitcard',
                        docType: 'ADMIT_CARD',
                        title: `Admit Card - ${a.exam?.title || 'Exam'}`,
                        subType: 'exam',
                        fileUrl: admitFileUrl,
                        pdfUrl: admitFileUrl,
                        webViewUrl: webViewUrl,
                        hasElements: !!(config?.elements?.length),
                        createdAt: a.issueDate,
                        examTitle: a.exam?.title,
                        examDate: a.exam?.startDate,
                        seatNumber: a.seatNumber,
                        center: a.center,
                    };
                }),
            ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return {
                documents,
                certificates,
                admitCards,
                idCards,
                stats: {
                    total: documents.length,
                    certificates: certificates.length,
                    idCards: idCards.length,
                    admitCards: admitCards.length,
                },
                student: {
                    id: student.userId,
                    userId: student.userId,
                    name: student.user?.name || student.name,
                    className: student.class?.className,
                    section: student.section?.name,
                }
            };
        }, 300);

        return apiResponse(result);

    } catch (error) {
        console.error('Error fetching student documents:', error);
        return errorResponse(error.message || 'Failed to fetch documents', 500);
    }
}
