// ============================================
// API: /api/fee/students/[studentId]/route.js
// ENHANCED: Return detailed installment breakdowns + payment settings
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req, props) {
    const params = await props.params;
    try {
        const { studentId } = params;
        const { searchParams } = new URL(req.url);
        const academicYearId = searchParams.get("academicYearId");

        if (!academicYearId) {
            return NextResponse.json({ error: "academicYearId required" }, { status: 400 });
        }

        // Fetch student fee and settings in parallel
        const [studentFee, student] = await Promise.all([
            prisma.studentFee.findUnique({
                where: { studentId_academicYearId: { studentId, academicYearId } },
                include: {
                    student: {
                        select: {
                            userId: true, name: true, admissionNo: true, rollNumber: true,
                            class: { select: { className: true } },
                            section: { select: { name: true } },
                            schoolId: true,
                        },
                    },
                    globalFeeStructure: {
                        select: {
                            name: true, mode: true,
                            installmentRules: { orderBy: { installmentNumber: 'asc' } }
                        },
                    },
                    particulars: { orderBy: { name: "asc" } },
                    installments: { orderBy: { installmentNumber: "asc" } },
                    payments: { orderBy: { paymentDate: "desc" }, where: { status: "SUCCESS" } },
                    discounts: { include: { approver: { select: { name: true } } } },
                },
            }),
            prisma.student.findUnique({
                where: { userId: studentId },
                select: { schoolId: true }
            })
        ]);

        // Fetch payment settings for this school
        const schoolId = student?.schoolId || studentFee?.student?.schoolId;

        let feeSettings = null;
        if (schoolId) {
            feeSettings = await prisma.schoolPaymentSettings.findUnique({
                where: { schoolId },
                select: {
                    isEnabled: true,
                    provider: true,
                    testMode: true,
                }
            });
        }

        if (!studentFee) {
            // Return empty structure instead of 404 to avoid frontend errors
            // Return empty structure instead of 404 to avoid frontend errors
            return NextResponse.json({
                originalAmount: 0,
                paidAmount: 0,
                balanceAmount: 0,
                installments: [],
                overdueCount: 0,
                nextDueInstallment: null,
                paymentOptions: {
                    onlineEnabled: feeSettings?.isEnabled ?? false,
                    gateway: feeSettings?.provider ?? null,
                    testMode: feeSettings?.testMode ?? true,
                },
            });
        }

        // Calculate installment breakdowns
        const enrichedInstallments = studentFee.installments.map(installment => {
            const rule = studentFee.globalFeeStructure?.installmentRules?.find(
                r => r.installmentNumber === installment.installmentNumber
            );
            const percentage = rule ? rule.percentage : 100;

            return {
                ...installment,
                rule: rule || null,
                particularBreakdowns: studentFee.particulars.map(p => ({
                    particularId: p.id,
                    particularName: p.name,
                    totalParticularAmount: p.amount,
                    amountInThisInstallment: (p.amount * percentage) / 100,
                })),
                canPayNow: installment.status !== 'PAID' && installment.amount > installment.paidAmount,
            };
        });

        // Update overdue status
        const now = new Date();
        const overdueInstallments = enrichedInstallments.filter(
            inst => inst.status !== "PAID" && new Date(inst.dueDate) < now
        );

        if (overdueInstallments.length > 0) {
            await prisma.studentFeeInstallment.updateMany({
                where: { id: { in: overdueInstallments.map(i => i.id) } },
                data: { isOverdue: true },
            });
        }

        return NextResponse.json({
            ...studentFee,
            installments: enrichedInstallments,
            overdueCount: overdueInstallments.length,
            nextDueInstallment: enrichedInstallments.find(inst => inst.status === "PENDING" && !inst.isOverdue),
            // Payment options for mobile app
            paymentOptions: {
                onlineEnabled: feeSettings?.isEnabled ?? false,
                gateway: feeSettings?.provider ?? null,
                testMode: feeSettings?.testMode ?? true,
            },
        });
    } catch (error) {
        console.error("Get Student Fee Error:", error);
        return NextResponse.json({ error: "Failed to fetch student fee details" }, { status: 500 });
    }
}