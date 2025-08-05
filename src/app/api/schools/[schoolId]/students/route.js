import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    const { schoolId } = await params // ✅ no await

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const start = performance.now();

        // const students = await prisma.student.findMany({
        //     where: { schoolId },
        //     select: {
        //         userId: true,
        //         name: true,
        //         // session: true,
        // class: {
        //     select: { className: true, sections: true }
        // },
        //         user: {
        //             select: { email: true }
        //         }
        //     }
        // });
        const students = await prisma.student.findMany({
            where: { schoolId },
            include: {
                user: {
                    select: {
                        email: true,
                        createdAt: true,
                        updatedAt: true,
                        status: true,
                        profilePicture: true,
                    }
                },
                class: {
                    select: { className: true, sections: true }
                },
                // class: {
                //     include: {
                //         sections: true   // includes all sections of the class
                //     }
                // },
                // section: true,        // includes section details
                // school: true,         // includes school info
                // examResults: true,
                // ExamIssue: true,
                // HomeworkSubmission: true,
                // FeeStructure: true,
                // FeePayment: true,
                // Add parent if it's a model:
                // parent: {
                //     include: {
                //         user: true       // if parent is related to User
                //     }
                // }
            }
        })

        const end = performance.now();
        console.log(`⏱️ DB query took ${(end - start).toFixed(2)} ms`);

        return NextResponse.json({ students });
    } catch (err) {
        console.error("[GET_STUDENTS]", err);
        return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
    }
}
