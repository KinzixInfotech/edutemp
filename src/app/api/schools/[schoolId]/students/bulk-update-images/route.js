import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * PATCH /api/schools/[schoolId]/students/bulk-update-images
 * 
 * Bulk update profile pictures for multiple students.
 * 
 * Body: {
 *   updates: [
 *     { userId: "uuid", profilePicture: "https://cdn.edubreezy.com/..." },
 *     ...
 *   ]
 * }
 */
export async function PATCH(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json();
        const { updates } = body;

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json(
                { error: "No updates provided" },
                { status: 400 }
            );
        }

        if (updates.length > 100) {
            return NextResponse.json(
                { error: "Maximum 100 updates per request" },
                { status: 400 }
            );
        }

        // Validate all userIds belong to this school
        const userIds = updates.map(u => u.userId);
        const validUsers = await prisma.user.findMany({
            where: {
                id: { in: userIds },
                schoolId: schoolId,
            },
            select: { id: true },
        });

        const validUserIds = new Set(validUsers.map(u => u.id));
        const invalidIds = userIds.filter(id => !validUserIds.has(id));

        if (invalidIds.length > 0) {
            return NextResponse.json(
                { error: `Invalid user IDs: ${invalidIds.join(', ')}` },
                { status: 400 }
            );
        }

        // Bulk update all profile pictures in a transaction
        const result = await prisma.$transaction(
            updates.map(({ userId, profilePicture }) =>
                prisma.user.update({
                    where: { id: userId },
                    data: { profilePicture },
                })
            )
        );

        return NextResponse.json({
            success: true,
            updated: result.length,
        });
    } catch (error) {
        console.error("Bulk image update error:", error);
        return NextResponse.json(
            { error: "Failed to update images", details: error.message },
            { status: 500 }
        );
    }
}
