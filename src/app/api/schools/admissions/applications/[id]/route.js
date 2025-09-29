// import { NextResponse } from "next/server";
// import { z } from "zod";
// import prisma from "@/lib/prisma";

// const idSchema = z.object({
//     id: z.string().uuid(),
// });

// export async function GET(req, context) {
// const params = await context.params;
// console.log("params resolved:", params);
// console.log("params:", params);

// console.log("type of params:", typeof params, params);

// const validated = idSchema.parse(params);

//     try {
//         const application = await prisma.application.findUnique({
//             where: { id: validated.id },
//             select: {
//                 id: true,
//                 applicantName: true,
//                 applicantEmail: true,
//                 data: true,
//                 submittedAt: true,
//                 currentStage: { select: { name: true } },
//                 documents: true,
//                 stageHistory: {
//                     select: {
//                         stage: { select: { name: true } },
//                         movedAt: true,
//                         notes: true,
//                         movedBy: { select: { name: true } },
//                     },
//                     orderBy: { movedAt: "asc" },
//                 },
//             },
//         });

//         if (!application) {
//             return NextResponse.json({ error: "Application not found" }, { status: 404 });
//         }

//         return NextResponse.json({ success: true, application });
//     } catch (err) {
//         console.error(err);
//         return NextResponse.json({ error: err.message }, { status: 500 });
//     }
// }

// app/api/schools/admissions/applications/[id]/route.js
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const idSchema = z.object({
    id: z.string().uuid(),
});

export async function GET(req, context) {

    try {
        const params = await context.params;
        console.log("params resolved:", params);
        console.log("params:", params);

        console.log("type of params:", typeof params, params);

        const validated = idSchema.parse(params);
        const application = await prisma.application.findUnique({
            where: { id: validated.id },
            select: {
                id: true,
                applicantName: true,
                applicantEmail: true,
                submittedAt: true,
                currentStage: { select: { id: true, name: true } },
                data: true,
                documents: true,
            },
        });
        if (!application) {
            return NextResponse.json({ error: "Application not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, application });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}