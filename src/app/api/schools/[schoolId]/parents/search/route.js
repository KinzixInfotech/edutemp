import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { remember, generateKey } from "@/lib/cache"

// app/api/schools/[schoolId]/parents/search/route.js
export async function GET(req, props) {
  const params = await props.params;
  const { schoolId } = params;
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''

  try {
    const cacheKey = generateKey('parents:search', { schoolId, q });

    const parents = await remember(cacheKey, async () => {
      return await prisma.parent.findMany({
        where: {
          schoolId,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { contactNumber: { contains: q, mode: 'insensitive' } }
          ]
        },
        take: 20
      });
    }, 60); // Cache for 1 minute

    return NextResponse.json({ parents })
  } catch (error) {
    console.error('Parent search error:', error);
    return NextResponse.json({ error: 'Failed to search parents' }, { status: 500 });
  }
}

