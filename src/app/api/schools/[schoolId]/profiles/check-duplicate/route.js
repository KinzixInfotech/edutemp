import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Lightweight duplicate-check endpoint for real-time form validation.
 * 
 * GET /api/schools/[schoolId]/profiles/check-duplicate?email=...&phone=...&role=...
 * 
 * Returns: { emailExists: boolean, phoneExists: boolean }
 */
export async function GET(req, context) {
    try {
        const { schoolId } = await context.params;
        const { searchParams } = new URL(req.url);
        const email = searchParams.get("email");
        const phone = searchParams.get("phone");
        const role = searchParams.get("role");

        const result = { emailExists: false, phoneExists: false };

        // Check email uniqueness across all users (global)
        if (email && email.includes("@")) {
            const existingUser = await prisma.user.findUnique({
                where: { email: email.toLowerCase().trim() },
                select: { id: true },
            });
            result.emailExists = !!existingUser;
        }

        // Check phone uniqueness within the school (role-specific)
        if (phone && /^\d{10}$/.test(phone)) {
            const roleType = role?.toLowerCase();
            let phoneRecord = null;

            if (roleType === "teacher") {
                phoneRecord = await prisma.teachingStaff.findFirst({
                    where: { schoolId, contactNumber: phone },
                    select: { id: true },
                });
            } else if (["staff", "non-teaching", "labassistants", "librarians", "accountants", "busdrivers"].includes(roleType)) {
                phoneRecord = await prisma.nonTeachingStaff.findFirst({
                    where: { schoolId, contactNumber: phone },
                    select: { id: true },
                });
            } else if (roleType === "parents") {
                phoneRecord = await prisma.parent.findFirst({
                    where: { schoolId, contactNumber: phone },
                    select: { id: true },
                });
            } else if (roleType === "students") {
                phoneRecord = await prisma.student.findFirst({
                    where: { schoolId, contactNumber: phone },
                    select: { id: true },
                });
            }

            result.phoneExists = !!phoneRecord;
        }

        return NextResponse.json(result);
    } catch (err) {
        console.error("[CHECK_DUPLICATE]", err);
        return NextResponse.json({ error: "Failed to check duplicates" }, { status: 500 });
    }
}
