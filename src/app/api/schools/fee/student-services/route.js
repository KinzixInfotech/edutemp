/**
 * API Route: /api/schools/fee/student-services
 * Method: GET, POST
 * Description: Subscribes / Unsubscribes a student to a specific service. Generates ledger entries when subscribing.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addOptionalComponent } from "@/lib/fee/ledger-engine";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");

        if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 });

        const services = await prisma.studentService.findMany({
            where: { studentId },
            include: { service: true }
        });

        return NextResponse.json({ success: true, services });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { action, studentId, serviceId, schoolId, academicYearId, feeSessionId, userId, overrideAmount } = body;

        const actorId = userId || "SYSTEM";

        if (!studentId || !serviceId) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        if (action === "subscribe") {
            if (!schoolId || !academicYearId || !feeSessionId) {
                return NextResponse.json({ error: "Missing session/school parameters for subscription" }, { status: 400 });
            }

            // 1. Create mapping
            const subscription = await prisma.studentService.upsert({
                where: { studentId_serviceId: { studentId, serviceId } },
                create: { studentId, serviceId, isActive: true, overrideAmount },
                update: { isActive: true, endDate: null, overrideAmount }
            });

            // 2. Find FeeComponent linked to this service in active session
            const component = await prisma.feeComponent.findFirst({
                where: { serviceId, feeSessionId, isActive: true }
            });

            let ledgerGenerated = 0;
            if (component && component.isOptional) {
                const res = await addOptionalComponent({
                    studentId, schoolId, academicYearId, feeSessionId,
                    feeComponentId: component.id, userId: actorId
                });
                ledgerGenerated = res.created;

                // Adjust the auto-generated entries with the override amount if provided
                if (overrideAmount !== undefined) {
                    await prisma.studentFeeLedger.updateMany({
                        where: { studentId, feeSessionId, feeComponentId: component.id, isFrozen: false },
                        data: {
                            originalAmount: overrideAmount,
                            netAmount: overrideAmount,
                            balanceAmount: overrideAmount
                        }
                    });
                }
            }

            return NextResponse.json({ success: true, subscription, ledgerGenerated });
        }

        if (action === "unsubscribe") {
            // Unsubscribe logic (stop generating future entries)
            const subscription = await prisma.studentService.update({
                where: { studentId_serviceId: { studentId, serviceId } },
                data: { isActive: false, endDate: new Date() }
            });

            // Delete future unfrozen ledger entries related to this service
            const component = await prisma.feeComponent.findFirst({
                where: { serviceId, isActive: true }
            });

            let deletedLedgers = 0;
            if (component) {
                const startOfNextMonth = new Date();
                startOfNextMonth.setMonth(startOfNextMonth.getMonth() + 1);
                startOfNextMonth.setDate(1);
                startOfNextMonth.setHours(0,0,0,0);

                const res = await prisma.studentFeeLedger.deleteMany({
                    where: {
                        studentId,
                        feeComponentId: component.id,
                        isFrozen: false,
                        month: { gte: startOfNextMonth }
                    }
                });
                deletedLedgers = res.count;
            }

            return NextResponse.json({ success: true, subscription, deletedLedgers });
        }

        return NextResponse.json({ error: "Invalid action. Use subscribe or unsubscribe." }, { status: 400 });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
