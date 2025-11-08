// ============================================
// API: /api/fee/reminders/schedule/route.js
// Schedule automated reminders (cron job)
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST_SCHEDULE_REMINDERS(req) {
    try {
        const body = await req.json();
        const {
            schoolId,
            academicYearId,
            scheduleType, // "DAILY", "WEEKLY", "BEFORE_DUE"
            daysBeforeDue,
            enabled,
        } = body;

        // In production, this would integrate with a job scheduler
        // like BullMQ, Agenda, or AWS EventBridge

        // For now, just save the schedule config
        const schedule = await prisma.school.update({
            where: { id: schoolId },
            data: {
                // Add a JSON field in School model for schedules
                // feeReminderSchedule: {
                //   enabled,
                //   scheduleType,
                //   daysBeforeDue,
                // },
            },
        });

        return NextResponse.json({
            message: "Reminder schedule updated",
            schedule,
        });
    } catch (error) {
        console.error("Schedule Reminders Error:", error);
        return NextResponse.json(
            { error: "Failed to schedule reminders" },
            { status: 500 }
        );
    }
}