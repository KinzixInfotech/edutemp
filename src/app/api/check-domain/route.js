// /app/api/check-domain/route.js
import  prisma  from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req) {
    const { searchParams } = new URL(req.url)
    const subdomain = searchParams.get("subdomain")
    const domain = `${subdomain}.edubreezy.com`

    if (!subdomain) return NextResponse.json({ exists: false })

    const exists = await prisma.school.findFirst({
        where: {
            domain: {
                equals: domain,
                mode: "insensitive",
            },
        },
        select: { id: true },
    })

    return NextResponse.json({ exists: !!exists })
}
