// ═══════════════════════════════════════════════════════════════
// ADD THESE TWO METHODS to /api/schools/fee/student-services/route.js
// alongside the existing GET and POST
// ═══════════════════════════════════════════════════════════════

// PATCH: update override amount or toggle active status
export async function PATCH(req) {
    try {
        const body = await req.json();
        const { subscriptionId, overrideAmount, isActive } = body;

        if (!subscriptionId) {
            return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
        }

        const subscription = await prisma.studentService.findUnique({
            where: { id: subscriptionId },
            include: { service: true },
        });

        if (!subscription) {
            return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
        }

        const updateData = {};
        if (overrideAmount !== undefined) updateData.overrideAmount = overrideAmount;
        if (isActive !== undefined) {
            updateData.isActive = isActive;
            if (!isActive) updateData.endDate = new Date();
            else updateData.endDate = null;
        }

        const updated = await prisma.studentService.update({
            where: { id: subscriptionId },
            data: updateData,
            include: { service: true },
        });

        // If override amount changed, update existing unfrozen ledger entries
        if (overrideAmount !== undefined) {
            // Find fee component linked to this service in the active session
            const component = await prisma.feeComponent.findFirst({
                where: { serviceId: subscription.serviceId, isActive: true },
            });

            if (component) {
                await prisma.studentFeeLedger.updateMany({
                    where: {
                        studentId: subscription.studentId,
                        feeComponentId: component.id,
                        isFrozen: false,
                    },
                    data: {
                        originalAmount: overrideAmount,
                        netAmount: overrideAmount,
                        balanceAmount: overrideAmount,
                    },
                });
            }
        }

        return NextResponse.json({ success: true, subscription: updated });
    } catch (error) {
        console.error("PATCH StudentService Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: remove subscription + cancel future ledger entries
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const subscriptionId = searchParams.get("subscriptionId");

        if (!subscriptionId) {
            return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
        }

        const subscription = await prisma.studentService.findUnique({
            where: { id: subscriptionId },
        });

        if (!subscription) {
            return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
        }

        // Find component linked to this service
        const component = await prisma.feeComponent.findFirst({
            where: { serviceId: subscription.serviceId, isActive: true },
        });

        let deletedLedgers = 0;
        if (component) {
            const startOfNextMonth = new Date();
            startOfNextMonth.setMonth(startOfNextMonth.getMonth() + 1);
            startOfNextMonth.setDate(1);
            startOfNextMonth.setHours(0, 0, 0, 0);

            const res = await prisma.studentFeeLedger.deleteMany({
                where: {
                    studentId: subscription.studentId,
                    feeComponentId: component.id,
                    isFrozen: false,
                    month: { gte: startOfNextMonth },
                },
            });
            deletedLedgers = res.count;
        }

        // Delete the subscription record
        await prisma.studentService.delete({ where: { id: subscriptionId } });

        return NextResponse.json({ success: true, deletedLedgers });
    } catch (error) {
        console.error("DELETE StudentService Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}