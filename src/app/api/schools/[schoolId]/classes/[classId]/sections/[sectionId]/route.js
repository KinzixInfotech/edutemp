import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { invalidatePattern } from "@/lib/cache";

export async function DELETE(req, props) {
    const { schoolId, classId, sectionId } = await props.params

    try {
        await prisma.section.delete({
            where: {
                id: parseInt(sectionId, 10),
                classId: parseInt(classId, 10),
            },
        })

        await invalidatePattern('classes:*')
        await invalidatePattern('classes:stats*')

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[SECTION_DELETE_ERROR]', error)
        return NextResponse.json(
            { error: 'Failed to delete section', message: error.message },
            { status: 500 }
        )
    }
}