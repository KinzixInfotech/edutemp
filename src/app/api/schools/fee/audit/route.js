// ============================================
// API: /api/schools/fee/audit/route.js
// Fee audit log management
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Fetch audit logs
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");
        const studentFeeId = searchParams.get("studentFeeId");
        const studentId = searchParams.get("studentId");
        const action = searchParams.get("action");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const limit = parseInt(searchParams.get("limit") || "100");
        const page = parseInt(searchParams.get("page") || "1");

        if (!schoolId) {
            return NextResponse.json(
                { error: "schoolId is required" },
                { status: 400 }
            );
        }

        const where = {
            schoolId,
            ...(studentFeeId && { studentFeeId }),
            ...(studentId && { studentId }),
            ...(action && { action }),
            ...(startDate || endDate) && {
                createdAt: {
                    ...(startDate && { gte: new Date(startDate) }),
                    ...(endDate && { lte: new Date(endDate) }),
                },
            },
        };

        const [logs, total] = await Promise.all([
            prisma.feeAuditLog.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: (page - 1) * limit,
            }),
            prisma.feeAuditLog.count({ where }),
        ]);

        return NextResponse.json({
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });

    } catch (error) {
        console.error("Fetch Audit Logs Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch audit logs" },
            { status: 500 }
        );
    }
}

// POST - Create audit log entry (internal use)
export async function POST(req) {
    try {
        const body = await req.json();
        const {
            schoolId,
            studentFeeId,
            studentId,
            action,
            description,
            previousValue,
            newValue,
            amount,
            performedBy,
            performedByName,
            performedByRole,
            metadata,
        } = body;

        if (!schoolId || !action || !description) {
            return NextResponse.json(
                { error: "Missing required fields: schoolId, action, description" },
                { status: 400 }
            );
        }

        // Get IP and User Agent from request headers
        const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
        const userAgent = req.headers.get("user-agent") || "unknown";

        const log = await prisma.feeAuditLog.create({
            data: {
                schoolId,
                studentFeeId,
                studentId,
                action,
                description,
                previousValue,
                newValue,
                amount,
                performedBy,
                performedByName,
                performedByRole,
                metadata,
                ipAddress,
                userAgent,
            },
        });

        return NextResponse.json({
            success: true,
            log,
        });

    } catch (error) {
        console.error("Create Audit Log Error:", error);
        return NextResponse.json(
            { error: "Failed to create audit log" },
            { status: 500 }
        );
    }
}

// Helper function to log fee actions (can be imported in other APIs)
export async function logFeeAction({
    schoolId,
    studentFeeId,
    studentId,
    action,
    description,
    previousValue,
    newValue,
    amount,
    performedBy,
    performedByName,
    performedByRole,
    metadata,
}) {
    try {
        await prisma.feeAuditLog.create({
            data: {
                schoolId,
                studentFeeId,
                studentId,
                action,
                description,
                previousValue,
                newValue,
                amount,
                performedBy,
                performedByName,
                performedByRole,
                metadata,
            },
        });
    } catch (error) {
        console.error("Failed to log fee action:", error);
        // Don't throw - audit logging should not break main flow
    }
}
