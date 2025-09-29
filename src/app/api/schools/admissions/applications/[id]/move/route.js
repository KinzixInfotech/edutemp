import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

// const moveSchema = z.object({
//     id: z.string().uuid(),
//     stageId: z.string(),
//     notes: z.string().optional(),
//     movedById: z.string().uuid(),
// });

// export async function POST(req, ctx) {
//     const {params} = await ctx
//     const data = await req.json();
//     console.log(data,'move');
    
//     const validated = moveSchema.parse({ ...data, id: params.id });
//     try {
//         const application = await prisma.application.findUnique({
//             where: { id: validated.id },
//             select: { currentStageId: true, schoolId: true },
//         });
//         if (!application) {
//             return NextResponse.json({ error: "Application not found" }, { status: 404 });
//         }
//         const stage = await prisma.stage.findUnique({
//             where: { id: validated.stageId },
//             select: { schoolId: true },
//         });
//         if (!stage || stage.schoolId !== application.schoolId) {
//             return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
//         }
//         // Verify movedById
//         const user = await prisma.user.findFirst({
//             where: { id: validated.movedById, schoolId: application.schoolId },
//         });
//         if (!user) {
//             return NextResponse.json({ error: "User not authorized" }, { status: 403 });
//         }
//         await prisma.$transaction([
//             prisma.application.update({
//                 where: { id: validated.id },
//                 data: { currentStageId: validated.stageId },
//             }),
//             prisma.stageHistory.create({
//                 data: {
//                     applicationId: validated.id,
//                     stageId: validated.stageId,
//                     movedById: validated.movedById,
//                     notes: validated.notes,
//                 },
//             }),
//         ]);
//         return NextResponse.json({ success: true });
//     } catch (err) {
//         console.error(err);
//         return NextResponse.json({ error: err.message }, { status: 500 });
//     }
// }

// app/api/schools/admissions/applications/[id]/move/route.js
const moveSchema = z.object({
  stageId: z.string().uuid(),
  movedById: z.string().uuid().optional(),
  stageData: z.record(z.any()).optional(), // Stage-specific data
});

export async function POST(req, { params }) {
  try {
    const data = await req.json();
    const validated = moveSchema.parse(data);
    const applicationId = z.string().uuid().parse(params.id);

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { currentStageId: true, data: true },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const updatedApplication = await prisma.$transaction([
      // Update the application with new stage and merged data
      prisma.application.update({
        where: { id: applicationId },
        data: {
          currentStageId: validated.stageId,
          data: {
            ...application.data,
            [validated.stageId]: validated.stageData || {}, // Store stage-specific data
          },
        },
        select: {
          id: true,
          currentStageId: true,
        },
      }),
      // Log the stage transition in StageHistory
      prisma.stageHistory.create({
        data: {
          applicationId,
          stageId: validated.stageId,
          movedById: validated.movedById,
          notes: validated.stageData?.notes || null,
        },
      }),
    ]);

    return NextResponse.json({ success: true, application: updatedApplication[0] });
  } catch (err) {
    console.error(err);
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}