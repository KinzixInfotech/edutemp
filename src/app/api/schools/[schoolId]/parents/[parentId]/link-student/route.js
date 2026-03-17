import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { generateKey, delCache, invalidatePattern } from "@/lib/cache";

// Only these relation types are allowed
const ALLOWED_RELATIONS = ["FATHER", "MOTHER", "GUARDIAN"];
const MAX_PARENTS_PER_STUDENT = 2;

export async function PATCH(req, props) {
    const params = await props.params;
    const { schoolId, parentId } = params;
    const { studentId, relation = "GUARDIAN", isPrimary = false } = await req.json();

    try {
        // Validate relation type
        if (!ALLOWED_RELATIONS.includes(relation)) {
            return NextResponse.json(
                { error: `Invalid relation type. Allowed: ${ALLOWED_RELATIONS.join(", ")}` },
                { status: 400 }
            );
        }

        // Check if link already exists between this parent and student
        const existing = await prisma.studentParentLink.findUnique({
            where: {
                studentId_parentId: {
                    studentId,
                    parentId,
                },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: "Student already linked to this parent" },
                { status: 400 }
            );
        }

        // Enforce max 2 active parent links per student
        const activeLinksCount = await prisma.studentParentLink.count({
            where: {
                studentId,
                isActive: true,
            },
        });

        if (activeLinksCount >= MAX_PARENTS_PER_STUDENT) {
            return NextResponse.json(
                { error: `A student can have at most ${MAX_PARENTS_PER_STUDENT} parent/guardian links. This student already has ${activeLinksCount}.` },
                { status: 400 }
            );
        }

        // If marking as primary, unset existing primary for this student
        if (isPrimary) {
            await prisma.studentParentLink.updateMany({
                where: {
                    studentId,
                    isPrimary: true,
                },
                data: {
                    isPrimary: false,
                },
            });
        }

        // Create link
        const link = await prisma.studentParentLink.create({
            data: {
                studentId,
                parentId,
                relation,
                isPrimary,
            },
        });

        // Invalidate caches
        const profileKey = generateKey("parent:profile", { schoolId, parentId });
        await delCache(profileKey);
        await invalidatePattern('parents:list*');
        await invalidatePattern('parent:profile*');
        await invalidatePattern('students*');

        return NextResponse.json({ success: true, link });
    } catch (error) {
        console.error("[LINK_STUDENT]", error);
        return NextResponse.json(
            { error: "Failed to link student" },
            { status: 500 }
        );
    }
}

export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId, parentId } = params;

    // Extract studentId from URL query
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    try {
        await prisma.studentParentLink.delete({
            where: {
                studentId_parentId: {
                    studentId,
                    parentId,
                },
            },
        });

        // Invalidate caches
        const profileKey = generateKey("parent:profile", { schoolId, parentId });
        await delCache(profileKey);
        await invalidatePattern('parents:list*');
        await invalidatePattern('parent:profile*');
        await invalidatePattern('students*');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[UNLINK_STUDENT]", error);
        return NextResponse.json(
            { error: "Failed to unlink student" },
            { status: 500 }
        );
    }
}