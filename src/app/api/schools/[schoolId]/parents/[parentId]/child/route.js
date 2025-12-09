// app/api/schools/[schoolId]/parents/[parentId]/child/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { remember, generateKey } from "@/lib/cache";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, parentId } = params;
    console.log(schoolId, parentId);

    try {
        const cacheKey = generateKey('parent:children', { schoolId, parentId });

        const result = await remember(cacheKey, async () => {
            // Single optimized query - fetches parent and children together
            const parent = await prisma.parent.findUnique({
                where: { id: parentId },
                select: {
                    id: true,
                    userId: true,
                    schoolId: true,
                    name: true,
                    email: true,
                    studentLinks: {
                        where: { isActive: true },
                        include: {
                            student: {
                                include: {
                                    class: { select: { className: true } },
                                    section: { select: { name: true } },
                                    user: { select: { profilePicture: true } },
                                },
                            },
                        },
                        orderBy: { linkedAt: "desc" },
                    },
                },
            });

            if (!parent || parent.schoolId !== schoolId) {
                return null;
            }

            // Transform response
            const children = parent.studentLinks.map(link => ({
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

            return {
                parent: {
                    id: parent.id,
                    name: parent.name,
                    email: parent.email,
                },
                children,
            };
        }, 300); // Cache for 5 minutes

        if (!result) {
            return NextResponse.json(
                { error: "Parent not found or unauthorized" },
                { status: 404 }
            );
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error("[PARENT_CHILDREN_GET]", error);
        return NextResponse.json(
            { error: "Failed to fetch linked children" },
            { status: 500 }
        );
    }
}