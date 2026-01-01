import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { remember, generateKey } from '@/lib/cache';

// GET - Fetch student fee details for payment portal
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const token = req.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Validate session from Redis
        const sessionData = await redis.get(`pay:session:${token}`);
        if (!sessionData) {
            return NextResponse.json(
                { error: 'Session expired. Please login again.' },
                { status: 401 }
            );
        }

        const session = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;
        const { studentId, academicYearId, schoolId } = session;

        // Cache key for this student's fee data
        const cacheKey = generateKey('pay:student-fees', { studentId, academicYearId });

        const data = await remember(cacheKey, async () => {
            // Fetch student with fee details
            const student = await prisma.student.findUnique({
                where: { userId: studentId },
                select: {
                    userId: true, // Primary Key
                    name: true,
                    admissionNo: true,
                    rollNumber: true,
                    FatherName: true,
                    MotherName: true,
                    contactNumber: true,
                    user: { select: { profilePicture: true } },
                    class: { select: { className: true } },
                    section: { select: { name: true } },
                    school: {
                        select: {
                            id: true, // Required for payment
                            name: true,
                            profilePicture: true,
                            schoolCode: true,
                            contactNumber: true,
                            location: true,
                        }
                    },
                    studentFees: {
                        where: { academicYearId },
                        include: {
                            academicYear: { select: { name: true } },
                            globalFeeStructure: {
                                select: {
                                    name: true,
                                    mode: true,
                                    installmentRules: {
                                        orderBy: { installmentNumber: 'asc' }
                                    }
                                }
                            },
                            particulars: {
                                orderBy: { name: 'asc' }
                            },
                            installments: {
                                orderBy: { installmentNumber: 'asc' }
                            },
                            payments: {
                                where: { status: 'SUCCESS' },
                                orderBy: { paymentDate: 'desc' },
                                select: {
                                    id: true,
                                    amount: true,
                                    paymentDate: true,
                                    paymentMethod: true,
                                    receiptNumber: true,
                                    status: true,
                                }
                            },
                            discounts: true,
                        }
                    }
                }
            });

            if (!student) {
                return null;
            }

            // Fetch fee settings for this school
            const feeSettings = await prisma.feeSettings.findUnique({
                where: { schoolId },
                select: {
                    onlinePaymentEnabled: true,
                    paymentGateway: true,
                    sandboxMode: true,
                    showBankDetails: true,
                    bankName: true,
                    accountNumber: true,
                    ifscCode: true,
                    accountHolderName: true,
                    branchName: true,
                    upiId: true,
                    allowPartialPayment: true,
                    allowAdvancePayment: true,
                },
            });

            const fee = student.studentFees[0];

            if (!fee) {
                return {
                    student: {
                        userId: student.userId,
                        name: student.name,
                        admissionNo: student.admissionNo,
                        rollNumber: student.rollNumber,
                        profilePicture: student.user?.profilePicture,
                        fatherName: student.FatherName,
                        motherName: student.MotherName,
                        class: student.class?.className,
                        section: student.section?.name,
                    },
                    school: student.school,
                    fee: null,
                    message: 'No fee assigned for this academic year',
                };
            }

            // Enrich installments
            const enrichedInstallments = fee.installments.map(installment => {
                const rule = fee.globalFeeStructure?.installmentRules?.find(
                    r => r.installmentNumber === installment.installmentNumber
                );
                const percentage = rule?.percentage || 100;

                return {
                    id: installment.id,
                    number: installment.installmentNumber,
                    name: rule?.name || `Installment ${installment.installmentNumber}`,
                    dueDate: installment.dueDate,
                    amount: installment.amount,
                    paidAmount: installment.paidAmount,
                    balance: installment.amount - installment.paidAmount,
                    status: installment.status,
                    isOverdue: installment.isOverdue,
                    paidDate: installment.paidDate,
                    lateFee: installment.lateFee,
                    canPayNow: installment.status !== 'PAID' && installment.paidAmount < installment.amount,
                    percentage,
                };
            });

            return {
                student: {
                    id: student.userId, // Map userId to id for frontend compatibility
                    userId: student.userId,
                    name: student.name,
                    admissionNo: student.admissionNo,
                    rollNumber: student.rollNumber,
                    profilePicture: student.user?.profilePicture,
                    fatherName: student.FatherName,
                    motherName: student.MotherName,
                    class: student.class?.className,
                    section: student.section?.name,
                },
                school: student.school,
                fee: {
                    id: fee.id,
                    structureName: fee.globalFeeStructure?.name || 'Custom Fee',
                    mode: fee.globalFeeStructure?.mode || 'YEARLY',
                    academicYear: fee.academicYear?.name,
                    originalAmount: fee.originalAmount,
                    discountAmount: fee.discountAmount,
                    finalAmount: fee.finalAmount,
                    paidAmount: fee.paidAmount,
                    balanceAmount: fee.balanceAmount,
                    status: fee.status,
                },
                particulars: fee.particulars.map(p => ({
                    id: p.id,
                    name: p.name,
                    amount: p.amount,
                    paidAmount: p.paidAmount,
                    status: p.status,
                })),
                installments: enrichedInstallments,
                payments: fee.payments,
                discounts: fee.discounts,
                summary: {
                    totalDue: fee.finalAmount,
                    totalPaid: fee.paidAmount,
                    totalBalance: fee.balanceAmount,
                    overdueCount: enrichedInstallments.filter(i => i.isOverdue && i.status !== 'PAID').length,
                    pendingCount: enrichedInstallments.filter(i => i.status === 'PENDING').length,
                },
                paymentOptions: {
                    onlineEnabled: feeSettings?.onlinePaymentEnabled ?? false,
                    allowPartialPayment: feeSettings?.allowPartialPayment ?? true,
                    allowAdvancePayment: feeSettings?.allowAdvancePayment ?? true,
                },
                bankDetails: feeSettings?.showBankDetails ? {
                    bankName: feeSettings.bankName,
                    accountNumber: feeSettings.accountNumber,
                    ifscCode: feeSettings.ifscCode,
                    accountHolderName: feeSettings.accountHolderName,
                    branchName: feeSettings.branchName,
                    upiId: feeSettings.upiId,
                } : null,
            };
        }, 60); // Cache for 1 minute

        if (!data) {
            return NextResponse.json(
                { error: 'Student not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('[PAY STUDENT FEES ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch fee details' },
            { status: 500 }
        );
    }
}
