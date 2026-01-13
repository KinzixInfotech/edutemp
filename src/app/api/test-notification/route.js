
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyFormSubmission, sendNotification } from "@/lib/notifications/notificationHelper";

// GET /api/test-notification?type=form&schoolId=...
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // 'form' or 'manual'
    const schoolId = searchParams.get("schoolId");
    const userId = searchParams.get("userId"); // Optional: test for specific user

    if (!schoolId) {
        return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
    }

    try {
        const debugInfo = {};

        // 1. Check Roles in DB
        // 1. Check Roles in DB
        const roles = await prisma.role.findMany({});
        debugInfo.roles = roles.map(r => r.name);

        // 2. Check Admins
        const admins = await prisma.user.findMany({
            where: {
                schoolId,
                role: { name: { in: ['ADMIN', 'Admin', 'admin'] } } // Check variations
            },
            select: { id: true, name: true, role: { select: { name: true } }, fcmToken: true }
        });
        debugInfo.admins = admins;

        let result;

        if (type === 'form') {
            // Test the specific helper
            result = await notifyFormSubmission({
                schoolId,
                formTitle: "TEST FORM SUBMISSION",
                applicantName: "Test Applicant",
                submissionId: "test-id",
                formId: "test-form-id"
            });
        } else {
            // Manual test
            result = await sendNotification({
                schoolId,
                title: "Test Notification",
                message: "This is a test notification from the debug script.",
                type: 'GENERAL',
                priority: 'HIGH',
                targetOptions: {
                    userIds: userId ? [userId] : admins.map(a => a.id) // Send to specific user or all found admins
                },
                metadata: { test: true },
                actionUrl: '/dashboard'
            });
        }

        return NextResponse.json({
            message: "Test run complete",
            debug: debugInfo,
            notificationResult: result
        });

    } catch (error) {
        console.error("Test notification error:", error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}