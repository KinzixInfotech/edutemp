// ============================================
// API: /api/fee/admin/reports/overdue/route.js
// Overdue fee report with detailed aging
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");
        const academicYearId = searchParams.get("academicYearId");

        if (!schoolId || !academicYearId) {
            return NextResponse.json(
                { error: "schoolId and academicYearId required" },
                { status: 400 }
            );
        }

        const now = new Date();

        const overdueData = await prisma.studentFee.findMany({
            where: {
                schoolId,
                academicYearId,
                status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
                installments: {
                    some: {
                        isOverdue: true,
                        status: { not: "PAID" },
                    },
                },
            },
            include: {
                student: {
                    select: {
                        userId: true,
                        name: true,
                        admissionNo: true,
                        rollNumber: true,
                        contactNumber: true,
                        FatherNumber: true,
                        MotherNumber: true,
                        class: { select: { className: true } },
                        section: { select: { name: true } },
                    },
                },
                installments: {
                    where: {
                        isOverdue: true,
                        status: { not: "PAID" },
                    },
                    orderBy: { dueDate: "asc" },
                },
            },
            orderBy: [
                { balanceAmount: "desc" },
            ],
        });

        const report = overdueData.map(fee => {
            const oldestDue = fee.installments[0];
            const daysPastDue = oldestDue
                ? Math.floor((now - new Date(oldestDue.dueDate)) / (1000 * 60 * 60 * 24))
                : 0;

            // Aging bucket
            let agingBucket = "0-30 days";
            if (daysPastDue > 90) agingBucket = "90+ days";
            else if (daysPastDue > 60) agingBucket = "60-90 days";
            else if (daysPastDue > 30) agingBucket = "30-60 days";

            return {
                ...fee.student,
                balanceAmount: fee.balanceAmount,
                overdueInstallments: fee.installments.length,
                oldestDueDate: oldestDue?.dueDate,
                daysPastDue,
                agingBucket,
                installments: fee.installments.map(inst => ({
                    number: inst.installmentNumber,
                    dueDate: inst.dueDate,
                    amount: inst.amount,
                    paidAmount: inst.paidAmount,
                    balance: inst.amount - inst.paidAmount,
                    lateFee: inst.lateFee,
                })),
            };
        });

        // Aging analysis
        const agingAnalysis = report.reduce((acc, r) => {
            if (!acc[r.agingBucket]) {
                acc[r.agingBucket] = { count: 0, amount: 0 };
            }
            acc[r.agingBucket].count += 1;
            acc[r.agingBucket].amount += r.balanceAmount;
            return acc;
        }, {});

        return NextResponse.json({
            report,
            summary: {
                totalOverdueStudents: report.length,
                totalOverdueAmount: report.reduce((sum, r) => sum + r.balanceAmount, 0),
                averageDaysPastDue: report.length
                    ? Math.round(report.reduce((sum, r) => sum + r.daysPastDue, 0) / report.length)
                    : 0,
            },
            agingAnalysis,
        });
    } catch (error) {
        console.error("Overdue Report Error:", error);
        return NextResponse.json(
            { error: "Failed to generate overdue report" },
            { status: 500 }
        );
    }
}