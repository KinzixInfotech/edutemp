import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invalidatePattern } from "@/lib/cache";

export async function DELETE(req, props) {
    const { schoolId, classId, sectionId } = await props.params

    try {
        await prisma.section.delete({
            where: { id: sectionId, classId },
        })

        await invalidatePattern(`classes:*schoolId:${schoolId}*`)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[SECTION_DELETE_ERROR]', error)
        return errorResponse('Failed to delete section', 500)
    }
}