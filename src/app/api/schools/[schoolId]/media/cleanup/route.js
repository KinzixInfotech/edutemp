import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// DELETE: Clean up invalid blob URLs from MediaLibrary
export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        // Delete all media items with invalid blob URLs
        const result = await prisma.mediaLibrary.deleteMany({
            where: {
                schoolId,
                url: {
                    startsWith: "blob:"
                }
            }
        });

        return NextResponse.json({
            success: true,
            deleted: result.count,
            message: `Cleaned up ${result.count} invalid images with blob URLs`
        });
    } catch (error) {
        console.error("Error cleaning up media library:", error);
        return NextResponse.json({ error: "Failed to clean up media library" }, { status: 500 });
    }
}
