// import { NextResponse } from "next/server"
// import { PrismaClient } from "@prisma/client"

// const prisma = new PrismaClient()

// export async function GET(request, context) {
//     const { schoolId } = context.params

//     try {
//         const [
//             students,

//             // teachers,
//             // parents,
//             // accountants,
//             // librarians,
//             // peons,
//             // busDrivers,
//             // labAssistants,
//         ] = await Promise.all([
//             prisma.student.findMany({ where: { schoolId } }),

//             // prisma.teacher.findMany({ where: { schoolId } }),
//             // prisma.parent.findMany({
//             //     where: {
//             //         students: {
//             //             some: {
//             //                 schoolId,
//             //             },
//             //         },
//             //     },
//             // }),
//             // prisma.accountant.findMany({ where: { schoolId } }),
//             // prisma.librarian.findMany({ where: { schoolId } }),
//             // prisma.peon.findMany({ where: { schoolId } }),
//             // prisma.busDriver.findMany({ where: { schoolId } }),
//             // prisma.labAssistant.findMany({ where: { schoolId } }),
//         ])

//         return NextResponse.json({
//             students,

//             // teachers,
//             // parents,
//             // accountants,
//             // librarians,
//             // peons,
//             // busDrivers,
//             // labAssistants,
//         })
//     } catch (err) {
//         console.error("[PROFILES_FETCH]", err)
//         return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
//     }
// }



import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request, { params }) {
    const { schoolId } = params

    try {
        const [students] = await Promise.all([
            prisma.student.findMany({ where: { schoolId } }),
        ])

        return NextResponse.json({ students })
    } catch (err) {
        console.error("[PROFILES_FETCH]", err)
        return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
    }
}
