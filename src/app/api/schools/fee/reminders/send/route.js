// ============================================
// API: /api/fee/reminders/send/route.js
// Send fee reminders (automated or manual)
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST_SEND_REMINDERS(req) {
    try {
        const body = await req.json();
        const {
            schoolId,
            academicYearId,
            reminderType, // "DUE_SOON", "OVERDUE", "CUSTOM"
            targetStudents, // Optional: specific student IDs
            daysBeforeDue, // For DUE_SOON type
            customMessage,
            channels, // ["EMAIL", "SMS", "APP"]
        } = body;

        if (!schoolId || !academicYearId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        let students = [];

        if (reminderType === "DUE_SOON") {
            // Find students with upcoming due installments
            const daysAhead = daysBeforeDue || 7;
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysAhead);

            const upcomingDues = await prisma.studentFeeInstallment.findMany({
                where: {
                    studentFee: {
                        schoolId,
                        academicYearId,
                    },
                    status: "PENDING",
                    dueDate: {
                        gte: new Date(),
                        lte: futureDate,
                    },
                },
                include: {
                    studentFee: {
                        include: {
                            student: {
                                select: {
                                    userId: true,
                                    name: true,
                                    email: true,
                                    contactNumber: true,
                                    FatherNumber: true,
                                },
                            },
                        },
                    },
                },
            });

            students = upcomingDues.map(due => ({
                ...due.studentFee.student,
                installment: {
                    number: due.installmentNumber,
                    dueDate: due.dueDate,
                    amount: due.amount,
                },
            }));
        } else if (reminderType === "OVERDUE") {
            // Find students with overdue installments
            const overdueFees = await prisma.studentFee.findMany({
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
                            email: true,
                            contactNumber: true,
                            FatherNumber: true,
                        },
                    },
                    installments: {
                        where: {
                            isOverdue: true,
                            status: { not: "PAID" },
                        },
                        orderBy: { dueDate: "asc" },
                        take: 1,
                    },
                },
            });

            students = overdueFees.map(fee => ({
                ...fee.student,
                balanceAmount: fee.balanceAmount,
                installment: fee.installments[0],
            }));
        } else if (targetStudents && targetStudents.length > 0) {
            // Custom reminder to specific students
            const customStudents = await prisma.student.findMany({
                where: {
                    userId: { in: targetStudents },
                    schoolId,
                },
                include: {
                    studentFees: {
                        where: { academicYearId },
                        include: {
                            installments: {
                                where: { status: { not: "PAID" } },
                                orderBy: { dueDate: "asc" },
                                take: 1,
                            },
                        },
                    },
                },
            });

            students = customStudents.map(s => ({
                userId: s.userId,
                name: s.name,
                email: s.email,
                contactNumber: s.contactNumber,
                FatherNumber: s.FatherNumber,
                balanceAmount: s.studentFees[0]?.balanceAmount,
                installment: s.studentFees[0]?.installments[0],
            }));
        }

        if (students.length === 0) {
            return NextResponse.json({
                message: "No students found for reminder",
                sent: 0,
            });
        }

        // Create reminder records
        const reminderPromises = students.map(student => {
            const message = customMessage || generateReminderMessage(
                reminderType,
                student
            );

            return prisma.feeReminder.create({
                data: {
                    studentId: student.userId,
                    studentFeeId: student.studentFees?.[0]?.id || student.installment?.studentFeeId,
                    reminderType: reminderType || "CUSTOM",
                    message,
                    scheduledDate: new Date(),
                    status: "PENDING",
                },
            });
        });

        const reminders = await Promise.all(reminderPromises);

        // TODO: Integrate with actual SMS/Email/Push notification services
        // For now, mark as sent
        await prisma.feeReminder.updateMany({
            where: { id: { in: reminders.map(r => r.id) } },
            data: { status: "SENT" },
        });

        // In production:
        // - Send emails via NodeMailer/SendGrid
        // - Send SMS via Twilio/AWS SNS
        // - Send push notifications via FCM

        return NextResponse.json({
            message: "Reminders sent successfully",
            sent: reminders.length,
            channels: channels || ["EMAIL"],
        });
    } catch (error) {
        console.error("Send Reminders Error:", error);
        return NextResponse.json(
            { error: "Failed to send reminders" },
            { status: 500 }
        );
    }
}

// Helper function to generate reminder messages
function generateReminderMessage(type, student) {
    const { name, installment, balanceAmount } = student;

    switch (type) {
        case "DUE_SOON":
            return `Dear Parent, This is a reminder that the fee installment #${installment.number} of ₹${installment.amount} for ${name} is due on ${new Date(installment.dueDate).toLocaleDateString()}. Please pay before the due date to avoid late fees.`;

        case "OVERDUE":
            return `Dear Parent, The fee installment #${installment.installmentNumber} of ₹${installment.amount} for ${name} is overdue since ${new Date(installment.dueDate).toLocaleDateString()}. Total pending: ₹${balanceAmount}. Please clear the dues at the earliest.`;

        case "PAYMENT_CONFIRMATION":
            return `Dear Parent, We have received your payment of ₹${installment.amount} for ${name}. Thank you for your payment.`;

        default:
            return `Dear Parent, This is a reminder regarding the fee payment for ${name}. Total pending: ₹${balanceAmount}.`;
    }
}
