// /app/api/schools/all/route.js

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function GET() {
    try {
        const schools = await prisma.school.findMany({
            orderBy: { createdAt: 'desc' },
            // include: {
            //     // schoolCode: true,
            //     // admin:true,
            // }
        })
        return Response.json(schools)
    } catch (err) {
    return Response.json({ error: `Failed to fetch schools ${err}` }, { status: 500 })
    }
}
