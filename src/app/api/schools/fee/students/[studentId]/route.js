import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateLateFees } from "@/lib/fee/late-fee-engine";
import { generateStudentLedger, regenerateStudentLedger } from "@/lib/fee/ledger-engine";

// Map GlobalFeeParticular enums → FeeComponent enums (same as ledger route)
const TYPE_MAP = { MONTHLY: 'MONTHLY', ONE_TIME: 'ONE_TIME', ANNUAL: 'ANNUAL', TERM: 'TERM' };
const CATEGORY_MAP = { TUITION: 'FEE_TUITION', TRANSPORT: 'FEE_TRANSPORT', ACTIVITY: 'FEE_ACTIVITY', ADMISSION: 'FEE_ADMISSION', EXAMINATION: 'FEE_EXAMINATION', LIBRARY: 'FEE_LIBRARY', LABORATORY: 'FEE_LABORATORY', SPORTS: 'FEE_SPORTS', HOSTEL: 'FEE_HOSTEL', DEVELOPMENT: 'FEE_DEVELOPMENT', FINE: 'FEE_FINE', MISCELLANEOUS: 'FEE_MISCELLANEOUS' };
const CHARGE_MAP = { SESSION_START: 'CHARGE_SESSION_START', ON_ADMISSION: 'CHARGE_ON_ADMISSION', ON_PROMOTION: 'CHARGE_ON_PROMOTION', MONTHLY: 'CHARGE_MONTHLY' };

async function syncFeeComponents(feeStructureId, session) {
    if (!feeStructureId || !session) return 0;
    const existing = await prisma.feeComponent.count({ where: { feeStructureId, feeSessionId: session.id } });
    if (existing > 0) return existing;
    const particulars = await prisma.globalFeeParticular.findMany({ where: { globalFeeStructureId: feeStructureId }, orderBy: { displayOrder: 'asc' } });
    if (!particulars.length) return 0;
    await prisma.feeComponent.createMany({
        data: particulars.map((p, i) => ({
            feeStructureId, feeSessionId: session.id, name: p.name, amount: p.amount,
            type: TYPE_MAP[p.type] || 'MONTHLY', category: CATEGORY_MAP[p.category] || 'FEE_TUITION',
            chargeTiming: CHARGE_MAP[p.chargeTiming] || 'CHARGE_MONTHLY', serviceId: p.serviceId || null,
            lateFeeRuleId: p.lateFeeRuleId || null, isOptional: p.isOptional || false, isActive: true,
            applicableMonths: p.applicableMonths ? JSON.parse(p.applicableMonths) : null, displayOrder: p.displayOrder ?? i,
        })),
        skipDuplicates: true,
    });
    return particulars.length;
}

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
        let resolvedSession = null;
        if (feeSessionId) {
            resolvedSession = await prisma.feeSession.findUnique({ where: { id: feeSessionId } });
        }

        if (!resolvedSession) {
            const student = await prisma.student.findUnique({
                where: { userId: studentId },
                select: { schoolId: true },
            });
            if (student) {
                resolvedSession = await prisma.feeSession.findFirst({
                    where: { schoolId: student.schoolId, academicYearId, isActive: true },
                });
                feeSessionId = resolvedSession?.id || null;
            } else {
                feeSessionId = null;
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
        let schoolPaymentSettings = null;
        if (schoolId) {
            feeSettings = await prisma.feeSettings.findUnique({
                where: { schoolId }
            });
            schoolPaymentSettings = await prisma.schoolPaymentSettings.findUnique({
                where: { schoolId },
                select: {
                    provider: true,
                }
            });
        }
        let sessionData = null;
        if (feeSessionId) {
            sessionData = await prisma.feeSession.findUnique({
                where: { id: feeSessionId }
            });
        }

        // 🟢 V2: Always regenerate ledger on every load to stay fresh
        let ledgerEntries = [];
        let walletBalance = 0;

        if (feeSessionId && studentFee?.globalFeeStructureId && resolvedSession) {
            try {
                // Sync FeeComponents from GlobalFeeParticular (no-op if already synced)
                await syncFeeComponents(studentFee.globalFeeStructureId, resolvedSession);

                // Always regenerate: deletes unfrozen entries & recreates from current data
                // Frozen entries (with payments) are NEVER touched
                await regenerateStudentLedger({
                    studentId,
                    feeSessionId: resolvedSession.id,
                    feeStructureId: studentFee.globalFeeStructureId,
                    userId: 'SYSTEM',
                });
            } catch (regenErr) {
                console.error('[Ledger Auto-Regen] Non-fatal error:', regenErr.message);
                // Continue — we'll still fetch whatever entries exist
            }

            // Calculate late fees
            await calculateLateFees(studentId, feeSessionId);

            // Fetch fresh ledger entries
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

            // Sync StudentFee totals from actual ledger data
            if (ledgerEntries.length > 0 && studentFee) {
                const totals = ledgerEntries.reduce((acc, e) => {
                    acc.originalAmount += e.originalAmount || 0;
                    acc.netAmount += e.netAmount || 0;
                    acc.paidAmount += e.paidAmount || 0;
                    acc.balanceAmount += e.balanceAmount || 0;
                    return acc;
                }, { originalAmount: 0, netAmount: 0, paidAmount: 0, balanceAmount: 0 });

                // Update in DB and in-memory object so the response is always accurate
                if (totals.netAmount !== studentFee.finalAmount || totals.paidAmount !== studentFee.paidAmount) {
                    await prisma.studentFee.update({
                        where: { id: studentFee.id },
                        data: {
                            originalAmount: totals.netAmount,
                            finalAmount: totals.netAmount,
                            paidAmount: totals.paidAmount,
                            balanceAmount: totals.balanceAmount,
                        }
                    });
                    studentFee.originalAmount = totals.netAmount;
                    studentFee.finalAmount = totals.netAmount;
                    studentFee.paidAmount = totals.paidAmount;
                    studentFee.balanceAmount = totals.balanceAmount;
                }
            }

            const wallet = await prisma.studentWallet.findUnique({
                where: { studentId }
            });
            walletBalance = wallet?.balance || 0;
        } else if (feeSessionId) {
            // No fee structure assigned — just fetch existing entries
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
            const wallet = await prisma.studentWallet.findUnique({ where: { studentId } });
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
                    onlineEnabled: feeSettings?.onlinePaymentEnabled ?? false,
                    gateway: schoolPaymentSettings?.provider ?? null,
                    testMode: feeSettings?.sandboxMode ?? true,
                    receiptSettings: {
                        receiptPrefix: feeSettings?.receiptPrefix || 'REC',
                        receiptPaperSize: feeSettings?.receiptPaperSize || 'a4',
                        showSchoolLogo: feeSettings?.showSchoolLogo ?? true,
                        showBalanceDue: feeSettings?.showBalanceDue ?? true,
                        showPaymentMode: feeSettings?.showPaymentMode ?? true,
                        showSignatureLine: feeSettings?.showSignatureLine ?? true,
                        receiptFooterText: feeSettings?.receiptFooterText || null,
                    },
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
                onlineEnabled: feeSettings?.onlinePaymentEnabled ?? false,
                gateway: schoolPaymentSettings?.provider ?? null,
                testMode: feeSettings?.sandboxMode ?? true,
                receiptSettings: {
                    receiptPrefix: feeSettings?.receiptPrefix || 'REC',
                    receiptPaperSize: feeSettings?.receiptPaperSize || 'a4',
                    showSchoolLogo: feeSettings?.showSchoolLogo ?? true,
                    showBalanceDue: feeSettings?.showBalanceDue ?? true,
                    showPaymentMode: feeSettings?.showPaymentMode ?? true,
                    showSignatureLine: feeSettings?.showSignatureLine ?? true,
                    receiptFooterText: feeSettings?.receiptFooterText || null,
                },
            },
        });
    } catch (error) {
        console.error("Get Student Fee Error:", error);
        return NextResponse.json({ error: `Failed to fetch student fee details ${error}`, }, { status: 500 });
    }
}