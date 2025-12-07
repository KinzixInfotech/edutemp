// app/api/schools/[schoolId]/parents/[parentId]/child/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, parentId } = params;
    console.log(schoolId, parentId);

    try {
        // Step 1: Verify parent exists and belongs to school
        const parent = await prisma.parent.findUnique({
            where: { id: parentId },
            select: { userId: true, id: true, schoolId: true, name: true, email: true },
        });

        if (!parent || parent.schoolId !== schoolId) {
            console.log('parent not found')
            return NextResponse.json(
                { error: "Parentd not found or unauthorized" },
                { status: 404 }
            );
        }

        // Step 2: Fetch all active linked children
        console.log(parentId, 'parent id');

        const linkedChildren = await prisma.studentParentLink.findMany({
            where: {
                parentId,
                isActive: true,
            },
            include: {
                // id:true,
                student: {
                    include: {
                        class: { select: { className: true } },
                        section: { select: { name: true } },
                        user: { select: { profilePicture: true } },
                    },
                },
            },
            orderBy: { linkedAt: "desc" },
        });

        // Transform response
        const children = linkedChildren.map(link => ({
            id: link.id,
            studentId: link.student.userId,
            name: link.student.name,
            admissionNo: link.student.admissionNo,
            rollNumber: link.student.rollNumber,
            class: link.student.class?.className,
            classId: link.student.classId,
            section: link.student.section?.name,
            sectionId: link.student.sectionId,
            profilePicture: link.student.user?.profilePicture,
            relation: link.relation,
            isPrimary: link.isPrimary,
            linkedAt: link.linkedAt,
        }));


        return NextResponse.json({
            parent: {
                id: parent.id,
                name: parent.name,
                email: parent.email,
            },
            children, // [] if no links
        });

    } catch (error) {
        console.error("[PARENT_CHILDREN_GET]", error);
        return NextResponse.json(
            { error: "Failed to fetch linked children" },
            { status: 500 }
        );
    }
}