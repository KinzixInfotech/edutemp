// Admin API: Get Admission Inquiries
// Auth required - ADMIN only

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { invalidatePattern } from '@/lib/cache';

export async function GET(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);

        // Filters
        const status = searchParams.get('status') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        // Get public profile
        const profile = await prisma.schoolPublicProfile.findUnique({
            where: { schoolId },
            select: { id: true }
        });

        if (!profile) {
            return NextResponse.json({ inquiries: [], total: 0 });
        }

        const where = {
            profileId: profile.id,
            ...(status && { status }),
        };

        const [inquiries, total] = await Promise.all([
            prisma.admissionInquiry.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.admissionInquiry.count({ where })
        ]);

        return NextResponse.json({
            inquiries,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            }
        });

    } catch (error) {
        console.error('[INQUIRIES API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch inquiries' },
            { status: 500 }
        );
    }
}

// Update inquiry status
export async function PATCH(req, props) {
    try {
        const params = await props.params;
        const { schoolId } = params;
        const body = await req.json();
        const { inquiryId, status, notes, convertToLead } = body;

        // Verify inquiry belongs to this school
        const inquiry = await prisma.admissionInquiry.findFirst({
            where: {
                id: inquiryId,
                profile: { schoolId },
            },
            include: {
                profile: {
                    select: { id: true, schoolId: true },
                },
            },
        });

        if (!inquiry) {
            return NextResponse.json(
                { error: 'Inquiry not found' },
                { status: 404 }
            );
        }

        if (convertToLead) {
            const publishedForm = await prisma.form.findFirst({
                where: {
                    schoolId,
                    category: 'ADMISSION',
                    status: 'PUBLISHED',
                },
                orderBy: { createdAt: 'desc' },
            });

            const fallbackForm = !publishedForm
                ? await prisma.form.findFirst({
                    where: {
                        schoolId,
                        category: 'ADMISSION',
                    },
                    orderBy: { createdAt: 'desc' },
                })
                : null;

            const admissionForm = publishedForm || fallbackForm;

            if (!admissionForm) {
                return NextResponse.json(
                    { error: 'No admission form found. Create an admission form first.' },
                    { status: 400 }
                );
            }

            const firstStage = await prisma.stage.findFirst({
                where: { schoolId },
                orderBy: { order: 'asc' },
            });

            const existingApplication = await prisma.application.findFirst({
                where: {
                    schoolId,
                    formId: admissionForm.id,
                    applicantEmail: inquiry.parentEmail,
                },
                select: { id: true },
            });

            let applicationId = existingApplication?.id;
            let created = false;

            if (!applicationId) {
                const application = await prisma.application.create({
                    data: {
                        schoolId,
                        formId: admissionForm.id,
                        applicantName: inquiry.studentName,
                        applicantEmail: inquiry.parentEmail,
                        currentStageId: firstStage?.id || null,
                        data: {
                            source: 'SCHOOL_EXPLORER_INQUIRY',
                            inquiryId: inquiry.id,
                            studentName: inquiry.studentName,
                            studentAge: inquiry.studentAge,
                            preferredGrade: inquiry.preferredGrade,
                            parentName: inquiry.parentName,
                            parentEmail: inquiry.parentEmail,
                            parentPhone: inquiry.parentPhone,
                            message: inquiry.message,
                            notes: notes ?? inquiry.notes ?? '',
                        },
                    },
                    select: { id: true },
                });

                applicationId = application.id;
                created = true;

                if (firstStage) {
                    await prisma.stageHistory.create({
                        data: {
                            applicationId,
                            stageId: firstStage.id,
                            notes: 'Created from school explorer inquiry',
                        },
                    });
                }
            }

            const updatedInquiry = await prisma.admissionInquiry.update({
                where: { id: inquiryId },
                data: {
                    status: 'Converted',
                    ...(notes !== undefined && { notes }),
                    updatedAt: new Date(),
                },
            });

            await invalidatePattern('admissions:applications*');

            return NextResponse.json({
                success: true,
                inquiry: updatedInquiry,
                applicationId,
                created,
            });
        }

        // Update inquiry
        const updated = await prisma.admissionInquiry.update({
            where: { id: inquiryId },
            data: {
                ...(status && { status }),
                ...(notes !== undefined && { notes }),
                updatedAt: new Date(),
            }
        });

        return NextResponse.json(updated);

    } catch (error) {
        console.error('[INQUIRY UPDATE API ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to update inquiry' },
            { status: 500 }
        );
    }
}
