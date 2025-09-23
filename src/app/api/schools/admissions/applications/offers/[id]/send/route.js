import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";

const offerSchema = z.object({
    id: z.string().uuid(),
    movedById: z.string().uuid(), // Admin triggering the offer
});

export async function POST(req, { params }) {
    const data = await req.json();
    const validated = offerSchema.parse({ ...data, id: params.id });
    let createdUser = null;
    try {
        const application = await prisma.application.findUnique({
            where: { id: validated.id },
            select: { applicantEmail: true, applicantName: true, schoolId: true },
        });
        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }
        // Verify movedById
        const user = await prisma.user.findFirst({
            where: { id: validated.movedById, schoolId: application.schoolId },
        });
        if (!user) {
            return NextResponse.json({ error: "User not authorized" }, { status: 403 });
        }
        // Create Supabase user
        const { data: userData, error } = await supabaseAdmin.auth.admin.createUser({
            email: application.applicantEmail,
            email_confirm: true,
            user_metadata: { name: application.applicantName, role: "parent" },
        });
        if (error) throw error;
        createdUser = userData.user.id;
        await prisma.user.create({
            data: {
                id: createdUser,
                email: application.applicantEmail,
                name: application.applicantName,
                password: "",
                schoolId: application.schoolId,
                roleId: 3, // parent role
            },
        });
        const acceptedStage = await prisma.stage.findFirst({
            where: { schoolId: application.schoolId, name: "Accepted" },
            select: { id: true },
        });
        if (!acceptedStage) {
            throw new Error("Accepted stage not found");
        }
        await prisma.$transaction([
            prisma.application.update({
                where: { id: validated.id },
                data: { currentStageId: acceptedStage.id },
            }),
            prisma.stageHistory.create({
                data: {
                    applicationId: validated.id,
                    stageId: acceptedStage.id,
                    movedById: validated.movedById,
                    notes: "Offer sent",
                },
            }),
        ]);
        const offerToken = require("nanoid").nanoid(16);
        return NextResponse.json({ success: true, offerToken, userId: createdUser });
    } catch (err) {
        console.error(err);
        if (createdUser) {
            await supabaseAdmin.auth.admin.deleteUser(createdUser);
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}