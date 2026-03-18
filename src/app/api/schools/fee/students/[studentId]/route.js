// ============================================
// API: /api/fee/students/[studentId]/route.js
// ENHANCED: Return detailed installment breakdowns + NEW Financial Ledger data
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateLateFees } from "@/lib/fee/late-fee-engine";

export async function GET(req, props) {
    const params = await props.params;
    try {
        const { studentId } = params;
        const { searchParams } = new URL(req.url);
        const academicYearId = searchParams.get("academicYearId");
        let feeSessionId = searchParams.get("feeSessionId"); // 🟢 New Ledger Support

        if (!academicYearId) {
            return NextResponse.json({ error: "academicYearId required" }, { status: 400 });
        }

        // Auto-resolve feeSessionId from academicYearId when they match or session ID is invalid
        // Frontend passes academicYearId as feeSessionId which causes "Fee session not found"
        if (feeSessionId) {
            const sessionCheck = await prisma.feeSession.findUnique({ where: { id: feeSessionId } });
            if (!sessionCheck) {
                // feeSessionId is invalid (likely academicYearId was passed), try to resolve
                const student = await prisma.student.findUnique({
                    where: { userId: studentId },
                    select: { schoolId: true },
                });
                if (student) {
                    const session = await prisma.feeSession.findFirst({
                        where: { schoolId: student.schoolId, academicYearId, isActive: true },
                    });
                    feeSessionId = session?.id || null;
                } else {
                    feeSessionId = null;
                }
            }
        }

        // Fetch student fee and settings in parallel
        const [studentFee, student] = await Promise.all([
            prisma.studentFee.findUnique({
                where: { studentId_academicYearId: { studentId, academicYearId } },
                include: {
                    student: {
                        select: {
                            userId: true, name: true, admissionNo: true, rollNumber: true, admissionDate: true,
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
        let sessionData = null;
        if (feeSessionId) {
            sessionData = await prisma.feeSession.findUnique({
                where: { id: feeSessionId }
            });
        }
        
        // 🟢 V2: Fetch NEW Financial Ledger Data if session ID is provided
        let ledgerEntries = [];
        let walletBalance = 0;
        
        if (feeSessionId) {
            // Update late fees first
            await calculateLateFees(studentId, feeSessionId);
            
            ledgerEntries = await prisma.studentFeeLedger.findMany({
                where: { studentId, feeSessionId },
                include: {
                    feeComponent: {
                        select: { name: true, type: true, category: true, isOptional: true }
                    }
                },
                orderBy: [
                    { month: "asc" },
                    { dueDate: "asc" },
                    { feeComponent: { displayOrder: "asc" } }
                ]
            });

            const wallet = await prisma.studentWallet.findUnique({
                where: { studentId }
            });
            walletBalance = wallet?.balance || 0;
        }

        if (!studentFee) {
            // Fetch student details so the frontend can at least display the header
            const studentDetails = await prisma.student.findUnique({
                where: { userId: studentId },
                select: {
                    userId: true, name: true, admissionNo: true, rollNumber: true, admissionDate: true,
                    class: { select: { className: true } },
                    section: { select: { name: true } },
                    schoolId: true,
                }
            });

            return NextResponse.json({
                isUnassigned: !feeSessionId || ledgerEntries.length === 0, // V1 flag compatibility
                student: studentDetails,
                session: sessionData,  // 🟢 Inject Session Data
                originalAmount: 0,
                paidAmount: 0,
                balanceAmount: 0,
                installments: [],
                ledger: ledgerEntries, // 🟢 Inject Ledger Data
                walletBalance,         // 🟢 Inject Wallet Data
                overdueCount: 0,
                nextDueInstallment: null,
                paymentOptions: {
                    onlineEnabled: feeSettings?.isEnabled ?? false,
                    gateway: feeSettings?.provider ?? null,
                    testMode: feeSettings?.testMode ?? true,
                },
            });
        }

        // Calculate installment breakdowns (V1 Legacy logic)
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
            session: sessionData,       // 🟢 Inject Session Data
            installments: enrichedInstallments,
            ledger: ledgerEntries,      // 🟢 Inject Ledger Data
            walletBalance,              // 🟢 Inject Wallet Data
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