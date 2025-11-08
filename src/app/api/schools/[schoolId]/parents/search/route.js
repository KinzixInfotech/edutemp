import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

// app/api/schools/[schoolId]/parents/search/route.js
export async function GET(req, props) {
  const params = await props.params; 
  const { schoolId } = params; 
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''

  const parents = await prisma.parent.findMany({
    where: {
      schoolId,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { contactNumber: { contains: q, mode: 'insensitive' } }
      ]
    },
    take: 20
  })

  return NextResponse.json({ parents })
}

