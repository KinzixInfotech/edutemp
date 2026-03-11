import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { invalidatePattern } from "@/lib/cache"

export async function PATCH(request, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        // Get current state
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, deletedAt: true, name: true },
        });

        if (!school) {
            return NextResponse.json({ error: "School not found" }, { status: 404 });
        }

        const isFrozen = !!school.deletedAt;

        // Toggle freeze state
        const updated = await prisma.school.update({
            where: { id: schoolId },
            data: {
                deletedAt: isFrozen ? null : new Date(),
            },
            select: {
                id: true,
                name: true,
                deletedAt: true,
            },
        });

        // Invalidate caches
        await invalidatePattern('schools:*');
        await invalidatePattern(`school:stats:*`);

        return NextResponse.json({
            success: true,
            school: updated,
            action: isFrozen ? 'unfrozen' : 'frozen',
            message: `School "${updated.name}" has been ${isFrozen ? 'unfrozen' : 'frozen'} successfully.`,
        });
    } catch (err) {
        console.error("[SCHOOL_FREEZE]", err);
        return NextResponse.json({ error: "Failed to update school status" }, { status: 500 });
    }
}
