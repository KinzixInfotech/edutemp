// ============================================
// API: /api/schools/fee/reports/route.js
// Comprehensive fee reports
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");
        const academicYearId = searchParams.get("academicYearId");
        const reportType = searchParams.get("type") || "dashboard";
        const classId = searchParams.get("classId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (!schoolId) {
            return NextResponse.json(
                { error: "schoolId is required" },
                { status: 400 }
            );
        }

        switch (reportType) {
            case "dashboard":
                return await getDashboardReport(schoolId, academicYearId);
            case "collection":
                return await getCollectionReport(schoolId, academicYearId, startDate, endDate);
            case "defaulters":
                return await getDefaultersReport(schoolId, academicYearId, classId);
            case "classwise":
                return await getClassWiseReport(schoolId, academicYearId);
            case "payment-methods":
                return await getPaymentMethodsReport(schoolId, academicYearId, startDate, endDate);
            case "monthly-trend":
                return await getMonthlyTrendReport(schoolId, academicYearId);
            case "day-collection":
                return await getDayCollectionReport(schoolId, startDate || new Date().toISOString().split('T')[0]);
            default:
                return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
        }

    } catch (error) {
        console.error("Fee Reports Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate report" },
            { status: 500 }
        );
    }
}

// Dashboard Summary
async function getDashboardReport(schoolId, academicYearId) {
    const where = {
        schoolId,
        ...(academicYearId && { academicYearId }),
    };

    // Get totals
    const fees = await prisma.studentFee.aggregate({
        where,
        _sum: {
            originalAmount: true,
            discountAmount: true,
            finalAmount: true,
            paidAmount: true,
            balanceAmount: true,
        },
        _count: true,
    });

    // Get status breakdown
    const statusBreakdown = await prisma.studentFee.groupBy({
        by: ["status"],
        where,
        _count: true,
        _sum: { balanceAmount: true },
    });

    // Get recent payments
    const recentPayments = await prisma.feePayment.findMany({
        where: { schoolId, status: "SUCCESS" },
        orderBy: { paymentDate: "desc" },
        take: 10,
        include: {
            student: { select: { name: true, admissionNo: true } },
        },
    });

    // Overdue installments
    const today = new Date();
    const overdueStats = await prisma.studentFeeInstallment.aggregate({
        where: {
            studentFee: { schoolId, ...(academicYearId && { academicYearId }) },
            status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
            dueDate: { lt: today },
        },
        _sum: { amount: true, paidAmount: true },
        _count: true,
    });

    return NextResponse.json({
        summary: {
            totalFees: fees._sum.finalAmount || 0,
            totalCollected: fees._sum.paidAmount || 0,
            totalPending: fees._sum.balanceAmount || 0,
            totalDiscounts: fees._sum.discountAmount || 0,
            collectionPercentage: fees._sum.finalAmount
                ? Math.round((fees._sum.paidAmount / fees._sum.finalAmount) * 100)
                : 0,
            studentCount: fees._count,
        },
        statusBreakdown,
        overdueStats: {
            count: overdueStats._count,
            amount: (overdueStats._sum.amount || 0) - (overdueStats._sum.paidAmount || 0),
        },
        recentPayments,
    });
}

// Collection Report
async function getCollectionReport(schoolId, academicYearId, startDate, endDate) {
    const where = {
        schoolId,
        status: "SUCCESS",
        ...(academicYearId && { studentFee: { academicYearId } }),
        paymentDate: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
        },
    };

    const payments = await prisma.feePayment.findMany({
        where,
        include: {
            student: { select: { name: true, admissionNo: true, class: { select: { className: true } } } },
        },
        orderBy: { paymentDate: "desc" },
    });

    const totals = await prisma.feePayment.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
    });

    // Group by payment method
    const byMethod = await prisma.feePayment.groupBy({
        by: ["paymentMethod"],
        where,
        _sum: { amount: true },
        _count: true,
    });

    // Group by payment mode
    const byMode = await prisma.feePayment.groupBy({
        by: ["paymentMode"],
        where,
        _sum: { amount: true },
        _count: true,
    });

    return NextResponse.json({
        payments,
        totals: {
            amount: totals._sum.amount || 0,
            count: totals._count,
        },
        byMethod,
        byMode,
    });
}

// Defaulters Report
async function getDefaultersReport(schoolId, academicYearId, classId) {
    const today = new Date();

    const defaulters = await prisma.studentFee.findMany({
        where: {
            schoolId,
            ...(academicYearId && { academicYearId }),
            ...(classId && { student: { classId: parseInt(classId) } }),
            status: { in: ["UNPAID", "PARTIAL"] },
            installments: {
                some: {
                    status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
                    dueDate: { lt: today },
                },
            },
        },
        include: {
            student: {
                select: {
                    name: true,
                    admissionNo: true,
                    FatherName: true,
                    contactNumber: true,
                    class: { select: { className: true } },
                    section: { select: { name: true } },
                },
            },
            installments: {
                where: {
                    status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
                    dueDate: { lt: today },
                },
                orderBy: { dueDate: "asc" },
            },
        },
        orderBy: { balanceAmount: "desc" },
    });

    // Calculate aging buckets
    const agingBuckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };

    for (const fee of defaulters) {
        for (const inst of fee.installments) {
            const daysOverdue = Math.floor((today - new Date(inst.dueDate)) / (1000 * 60 * 60 * 24));
            const balance = inst.amount - inst.paidAmount;

            if (daysOverdue <= 30) agingBuckets["0-30"] += balance;
            else if (daysOverdue <= 60) agingBuckets["31-60"] += balance;
            else if (daysOverdue <= 90) agingBuckets["61-90"] += balance;
            else agingBuckets["90+"] += balance;
        }
    }

    return NextResponse.json({
        defaulters: defaulters.map(d => ({
            student: d.student,
            totalDue: d.finalAmount,
            paid: d.paidAmount,
            balance: d.balanceAmount,
            overdueInstallments: d.installments.length,
            oldestOverdue: d.installments[0]?.dueDate,
        })),
        totalDefaulters: defaulters.length,
        totalOverdueAmount: defaulters.reduce((sum, d) => sum + d.balanceAmount, 0),
        agingBuckets,
    });
}

// Class-wise Report
async function getClassWiseReport(schoolId, academicYearId) {
    const classes = await prisma.class.findMany({
        where: { schoolId },
        select: { id: true, className: true },
        orderBy: { className: "asc" },
    });

    const classStats = await Promise.all(
        classes.map(async (cls) => {
            const fees = await prisma.studentFee.aggregate({
                where: {
                    schoolId,
                    ...(academicYearId && { academicYearId }),
                    student: { classId: cls.id },
                },
                _sum: {
                    finalAmount: true,
                    paidAmount: true,
                    balanceAmount: true,
                },
                _count: true,
            });

            return {
                classId: cls.id,
                className: cls.className,
                studentCount: fees._count,
                totalFees: fees._sum.finalAmount || 0,
                collected: fees._sum.paidAmount || 0,
                pending: fees._sum.balanceAmount || 0,
                collectionPercentage: fees._sum.finalAmount
                    ? Math.round((fees._sum.paidAmount / fees._sum.finalAmount) * 100)
                    : 0,
            };
        })
    );

    return NextResponse.json({
        classStats,
        totals: {
            classes: classStats.length,
            students: classStats.reduce((sum, c) => sum + c.studentCount, 0),
            totalFees: classStats.reduce((sum, c) => sum + c.totalFees, 0),
            collected: classStats.reduce((sum, c) => sum + c.collected, 0),
            pending: classStats.reduce((sum, c) => sum + c.pending, 0),
        },
    });
}

// Payment Methods Report
async function getPaymentMethodsReport(schoolId, academicYearId, startDate, endDate) {
    const where = {
        schoolId,
        status: "SUCCESS",
        ...(academicYearId && { studentFee: { academicYearId } }),
        ...(startDate && { paymentDate: { gte: new Date(startDate) } }),
        ...(endDate && { paymentDate: { lte: new Date(endDate) } }),
    };

    const byMethod = await prisma.feePayment.groupBy({
        by: ["paymentMethod"],
        where,
        _sum: { amount: true },
        _count: true,
    });

    const byMode = await prisma.feePayment.groupBy({
        by: ["paymentMode"],
        where,
        _sum: { amount: true },
        _count: true,
    });

    const total = byMethod.reduce((sum, m) => sum + (m._sum.amount || 0), 0);

    return NextResponse.json({
        byMethod: byMethod.map(m => ({
            method: m.paymentMethod,
            amount: m._sum.amount || 0,
            count: m._count,
            percentage: total ? Math.round((m._sum.amount / total) * 100) : 0,
        })),
        byMode: byMode.map(m => ({
            mode: m.paymentMode,
            amount: m._sum.amount || 0,
            count: m._count,
            percentage: total ? Math.round((m._sum.amount / total) * 100) : 0,
        })),
        total,
    });
}

// Monthly Trend Report
async function getMonthlyTrendReport(schoolId, academicYearId) {
    const months = [];
    const today = new Date();

    // Get last 12 months
    for (let i = 11; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const payments = await prisma.feePayment.aggregate({
            where: {
                schoolId,
                status: "SUCCESS",
                paymentDate: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
                ...(academicYearId && { studentFee: { academicYearId } }),
            },
            _sum: { amount: true },
            _count: true,
        });

        months.push({
            month: date.toLocaleString("default", { month: "short", year: "numeric" }),
            amount: payments._sum.amount || 0,
            count: payments._count,
        });
    }

    return NextResponse.json({ months });
}

// Day Collection Report
async function getDayCollectionReport(schoolId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const payments = await prisma.feePayment.findMany({
        where: {
            schoolId,
            status: "SUCCESS",
            paymentDate: {
                gte: startOfDay,
                lte: endOfDay,
            },
        },
        include: {
            student: {
                select: {
                    name: true,
                    admissionNo: true,
                    class: { select: { className: true } },
                },
            },
        },
        orderBy: { paymentDate: "desc" },
    });

    const totals = {
        count: payments.length,
        amount: payments.reduce((sum, p) => sum + p.amount, 0),
        cash: payments.filter(p => p.paymentMethod === "CASH").reduce((sum, p) => sum + p.amount, 0),
        online: payments.filter(p => p.paymentMode === "ONLINE").reduce((sum, p) => sum + p.amount, 0),
    };

    return NextResponse.json({
        date,
        payments,
        totals,
    });
}
