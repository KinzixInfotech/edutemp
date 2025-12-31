// ============================================
// API: /api/schools/fee/overdue/check/route.js
// Check and mark overdue installments
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req) {
    try {
        const body = await req.json();
        const { schoolId, dryRun = false } = body;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Build where clause
        const whereClause = {
            status: { in: ["PENDING", "PARTIAL"] },
            dueDate: { lt: today },
            isOverdue: false, // Only update ones not already marked
            ...(schoolId && { studentFee: { schoolId } }),
        };

        // Find installments that should be marked as overdue
        const overdueInstallments = await prisma.studentFeeInstallment.findMany({
            where: whereClause,
            include: {
                studentFee: {
                    include: {
                        student: { select: { name: true, admissionNo: true } },
                        school: { select: { name: true, id: true } },
                    },
                },
            },
        });

        if (overdueInstallments.length === 0) {
            return NextResponse.json({
                message: "No new overdue installments found",
                updated: 0,
            });
        }

        const results = [];

        if (!dryRun) {
            // Update all to overdue
            for (const installment of overdueInstallments) {
                await prisma.studentFeeInstallment.update({
                    where: { id: installment.id },
                    data: {
                        isOverdue: true,
                        status: "OVERDUE",
                    },
                });

                results.push({
                    installmentId: installment.id,
                    studentName: installment.studentFee.student.name,
                    admissionNo: installment.studentFee.student.admissionNo,
                    schoolName: installment.studentFee.school.name,
                    installmentNumber: installment.installmentNumber,
                    dueDate: installment.dueDate,
                    amount: installment.amount,
                    paidAmount: installment.paidAmount,
                    balance: installment.amount - installment.paidAmount,
                    daysOverdue: Math.floor((today - new Date(installment.dueDate)) / (1000 * 60 * 60 * 24)),
                });
            }
        } else {
            // Dry run - just collect info
            for (const installment of overdueInstallments) {
                results.push({
                    installmentId: installment.id,
                    studentName: installment.studentFee.student.name,
                    admissionNo: installment.studentFee.student.admissionNo,
                    schoolName: installment.studentFee.school.name,
                    installmentNumber: installment.installmentNumber,
                    dueDate: installment.dueDate,
                    amount: installment.amount,
                    paidAmount: installment.paidAmount,
                    balance: installment.amount - installment.paidAmount,
                    daysOverdue: Math.floor((today - new Date(installment.dueDate)) / (1000 * 60 * 60 * 24)),
                });
            }
        }

        // Group by school for summary
        const bySchool = results.reduce((acc, r) => {
            acc[r.schoolName] = (acc[r.schoolName] || 0) + 1;
            return acc;
        }, {});

        const totalOverdueAmount = results.reduce((sum, r) => sum + r.balance, 0);

        return NextResponse.json({
            success: true,
            message: dryRun ? "Dry run complete - no changes made" : "Overdue installments updated",
            updated: results.length,
            totalOverdueAmount,
            bySchool,
            dryRun,
            details: results.slice(0, 100), // Limit details to first 100
        });

    } catch (error) {
        console.error("Check Overdue Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to check overdue installments" },
            { status: 500 }
        );
    }
}

// GET - Get current overdue stats
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");

        const today = new Date();

        const whereClause = {
            status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
            dueDate: { lt: today },
            ...(schoolId && { studentFee: { schoolId } }),
        };

        // Get overdue stats
        const stats = await prisma.studentFeeInstallment.aggregate({
            where: whereClause,
            _sum: {
                amount: true,
                paidAmount: true,
                lateFee: true,
            },
            _count: true,
        });

        // Get aging breakdown
        const installments = await prisma.studentFeeInstallment.findMany({
            where: whereClause,
            select: {
                dueDate: true,
                amount: true,
                paidAmount: true,
            },
        });

        const aging = {
            "0-30": { count: 0, amount: 0 },
            "31-60": { count: 0, amount: 0 },
            "61-90": { count: 0, amount: 0 },
            "90+": { count: 0, amount: 0 },
        };

        for (const inst of installments) {
            const daysOverdue = Math.floor((today - new Date(inst.dueDate)) / (1000 * 60 * 60 * 24));
            const balance = inst.amount - inst.paidAmount;

            if (daysOverdue <= 30) {
                aging["0-30"].count++;
                aging["0-30"].amount += balance;
            } else if (daysOverdue <= 60) {
                aging["31-60"].count++;
                aging["31-60"].amount += balance;
            } else if (daysOverdue <= 90) {
                aging["61-90"].count++;
                aging["61-90"].amount += balance;
            } else {
                aging["90+"].count++;
                aging["90+"].amount += balance;
            }
        }

        return NextResponse.json({
            overdueCount: stats._count,
            totalAmount: (stats._sum.amount || 0) - (stats._sum.paidAmount || 0),
            totalLateFees: stats._sum.lateFee || 0,
            aging,
        });

    } catch (error) {
        console.error("Get Overdue Stats Error:", error);
        return NextResponse.json(
            { error: "Failed to get overdue stats" },
            { status: 500 }
        );
    }
}
