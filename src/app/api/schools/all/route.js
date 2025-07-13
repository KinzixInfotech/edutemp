// /app/api/schools/all/route.js

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function GET() {
    try {
        const schools = await prisma.school.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return Response.json(schools)
    } catch (err) {
        return Response.json({ error: 'Failed to fetch schools' }, { status: 500 })
    }
}
